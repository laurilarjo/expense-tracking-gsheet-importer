import * as tf from '@tensorflow/tfjs';
import { Transaction } from '../types/transaction';
import { CategorizationResult, TrainingData, ModelMetadata } from '../types/categorization';
import { 
  extractTextFeatures, 
  createVocabulary, 
  createNumericalFeatures,
  normalizeText 
} from '../utils/text-preprocessing';

export class MLCategorizationService {
  private model: tf.LayersModel | null = null;
  private vocabulary: string[] = [];
  private categories: string[] = [];
  private metadata: ModelMetadata | null = null;

  /**
   * Train the ML model using historical transaction data
   */
  async trainModel(transactions: Transaction[], categories: string[]): Promise<ModelMetadata> {
    console.log(`🤖 Starting ML model training with ${transactions.length} transactions`);
    
    // Filter transactions with valid categories
    const validTransactions = transactions.filter(t => 
      t.category && t.category.trim() !== '' && categories.includes(t.category)
    );
    
    if (validTransactions.length === 0) {
      throw new Error('No valid training data found');
    }

    console.log(`📊 Valid training data: ${validTransactions.length} transactions`);
    console.log(`🏷️  Categories: ${categories.join(', ')}`);

    // Create vocabulary from all transaction text
    this.vocabulary = createVocabulary(validTransactions);
    this.categories = categories;
    
    console.log(`📝 Vocabulary size: ${this.vocabulary.length}`);

    // Prepare training data
    const trainingData = this.prepareTrainingData(validTransactions);
    
    // Split data into training and validation sets
    const { trainData, trainLabels, valData, valLabels } = this.splitData(trainingData);

    // Create and compile model
    this.model = this.createModel(this.vocabulary.length + 4); // +4 for numerical features
    
    // Train the model
    const history = await this.model.fit(trainData, trainLabels, {
      epochs: 50,
      batchSize: 32,
      validationData: [valData, valLabels],
      callbacks: {
        onEpochEnd: (epoch, logs) => {
          console.log(`Epoch ${epoch + 1}: loss=${logs?.loss?.toFixed(4)}, accuracy=${logs?.acc?.toFixed(4)}`);
        }
      }
    });

    // Calculate final accuracy
    const predictions = this.model.predict(valData) as tf.Tensor;
    const predictedLabels = predictions.argMax(1);
    const actualLabels = valLabels.argMax(1);
    const accuracy = tf.mean(tf.equal(predictedLabels, actualLabels)).dataSync()[0];

    // Create metadata
    this.metadata = {
      version: '1.0.0',
      trainingDate: new Date(),
      accuracy: accuracy,
      categories: categories,
      transactionCount: validTransactions.length,
      validationAccuracy: accuracy
    };

    console.log(`✅ Model training completed with accuracy: ${(accuracy * 100).toFixed(2)}%`);

    // Clean up tensors
    trainData.dispose();
    trainLabels.dispose();
    valData.dispose();
    valLabels.dispose();
    predictions.dispose();
    predictedLabels.dispose();
    actualLabels.dispose();

    return this.metadata;
  }

  /**
   * Predict category for a single transaction
   */
  async predictCategory(transaction: Transaction): Promise<CategorizationResult> {
    if (!this.model || !this.metadata) {
      throw new Error('Model not trained. Please train the model first.');
    }

    // Prepare transaction features
    const features = createNumericalFeatures(transaction, this.vocabulary);
    const inputTensor = tf.tensor2d([features]);
    
    // Make prediction
    const prediction = this.model.predict(inputTensor) as tf.Tensor;
    const probabilities = await prediction.data();
    
    // Find top predictions
    const results = Array.from(probabilities)
      .map((prob, index) => ({
        category: this.categories[index],
        confidence: prob
      }))
      .sort((a, b) => b.confidence - a.confidence);

    const topResult = results[0];
    const alternatives = results.slice(1, 4); // Top 3 alternatives

    // Clean up tensors
    inputTensor.dispose();
    prediction.dispose();

    return {
      category: topResult.category,
      confidence: topResult.confidence,
      alternatives: alternatives
    };
  }

  /**
   * Get model confidence for a prediction
   */
  getModelConfidence(prediction: CategorizationResult): number {
    return prediction.confidence;
  }

  /**
   * Save trained model to IndexedDB
   */
  async saveModelToIndexedDB(): Promise<void> {
    if (!this.model || !this.metadata) {
      throw new Error('No model to save');
    }

    try {
      // Save model
      await this.model.save('indexeddb://ml-categorization-model');
      
      // Save metadata
      const metadataKey = 'ml-categorization-metadata';
      localStorage.setItem(metadataKey, JSON.stringify(this.metadata));
      
      // Save vocabulary and categories
      localStorage.setItem('ml-categorization-vocabulary', JSON.stringify(this.vocabulary));
      localStorage.setItem('ml-categorization-categories', JSON.stringify(this.categories));
      
      console.log('💾 Model saved to IndexedDB');
    } catch (error) {
      console.error('Error saving model:', error);
      throw error;
    }
  }

  /**
   * Load trained model from IndexedDB
   */
  async loadModelFromIndexedDB(): Promise<boolean> {
    try {
      // Load model
      this.model = await tf.loadLayersModel('indexeddb://ml-categorization-model');
      
      // Load metadata
      const metadataStr = localStorage.getItem('ml-categorization-metadata');
      if (metadataStr) {
        this.metadata = JSON.parse(metadataStr);
      }
      
      // Load vocabulary and categories
      const vocabularyStr = localStorage.getItem('ml-categorization-vocabulary');
      const categoriesStr = localStorage.getItem('ml-categorization-categories');
      
      if (vocabularyStr && categoriesStr) {
        this.vocabulary = JSON.parse(vocabularyStr);
        this.categories = JSON.parse(categoriesStr);
        
        console.log('📂 Model loaded from IndexedDB');
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error loading model:', error);
      return false;
    }
  }

  /**
   * Check if model is available
   */
  isModelAvailable(): boolean {
    return this.model !== null && this.metadata !== null;
  }

  /**
   * Get model metadata
   */
  getModelMetadata(): ModelMetadata | null {
    return this.metadata;
  }

  /**
   * Prepare training data from transactions
   */
  private prepareTrainingData(transactions: Transaction[]): { features: number[][], labels: number[] } {
    const features: number[][] = [];
    const labels: number[] = [];

    transactions.forEach(transaction => {
      const numericalFeatures = createNumericalFeatures(transaction, this.vocabulary);
      features.push(numericalFeatures);
      
      const categoryIndex = this.categories.indexOf(transaction.category!);
      labels.push(categoryIndex);
    });

    return { features, labels };
  }

  /**
   * Split data into training and validation sets
   */
  private splitData(data: { features: number[][], labels: number[] }): {
    trainData: tf.Tensor2D,
    trainLabels: tf.Tensor2D,
    valData: tf.Tensor2D,
    valLabels: tf.Tensor2D
  } {
    const { features, labels } = data;
    const totalSamples = features.length;
    const valSize = Math.floor(totalSamples * 0.2); // 20% for validation
    
    // Shuffle indices
    const indices = Array.from({ length: totalSamples }, (_, i) => i);
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    
    // Split data
    const trainIndices = indices.slice(0, totalSamples - valSize);
    const valIndices = indices.slice(totalSamples - valSize);
    
    const trainFeatures = trainIndices.map(i => features[i]);
    const trainLabels = trainIndices.map(i => labels[i]);
    const valFeatures = valIndices.map(i => features[i]);
    const valLabels = valIndices.map(i => labels[i]);
    
    // Convert to one-hot encoding for labels
    const trainLabelsOneHot = this.toOneHot(trainLabels, this.categories.length);
    const valLabelsOneHot = this.toOneHot(valLabels, this.categories.length);
    
    return {
      trainData: tf.tensor2d(trainFeatures),
      trainLabels: tf.tensor2d(trainLabelsOneHot),
      valData: tf.tensor2d(valFeatures),
      valLabels: tf.tensor2d(valLabelsOneHot)
    };
  }

  /**
   * Convert labels to one-hot encoding
   */
  private toOneHot(labels: number[], numClasses: number): number[][] {
    return labels.map(label => {
      const oneHot = new Array(numClasses).fill(0);
      oneHot[label] = 1;
      return oneHot;
    });
  }

  /**
   * Create the neural network model
   */
  private createModel(inputSize: number): tf.LayersModel {
    const model = tf.sequential({
      layers: [
        tf.layers.dense({
          inputShape: [inputSize],
          units: 128,
          activation: 'relu',
          kernelRegularizer: tf.regularizers.l2({ l2: 0.001 })
        }),
        tf.layers.dropout({ rate: 0.3 }),
        tf.layers.dense({
          units: 64,
          activation: 'relu',
          kernelRegularizer: tf.regularizers.l2({ l2: 0.001 })
        }),
        tf.layers.dropout({ rate: 0.3 }),
        tf.layers.dense({
          units: 32,
          activation: 'relu'
        }),
        tf.layers.dense({
          units: this.categories.length,
          activation: 'softmax'
        })
      ]
    });

    model.compile({
      optimizer: tf.train.adam(0.001),
      loss: 'categoricalCrossentropy',
      metrics: ['accuracy']
    });

    return model;
  }
}
