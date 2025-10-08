# Feature 0001: Automatic Transaction Categorization using TensorFlow.js

## Description

Implement automatic transaction categorization using TensorFlow.js that learns from the user's historical categorization data in Google Sheets. The system will use previous years' transaction data as training data to build a machine learning model, then automatically categorize new transactions when users upload files.

## Context

Currently, users manually categorize transactions by filling the "category" field in Google Sheets. This feature will automate this process by:
- Reading historical transaction data from Google Sheets (including manually assigned categories)
- Training a TensorFlow.js model in the browser using this historical data
- Using the trained model to automatically suggest categories for new transactions
- Providing confidence scores for categorization suggestions

## Files and Functions to Change

### New Files to Create

**`src/lib/services/ml-categorization-service.ts`**
- `MLCategorizationService` class to handle model training and prediction
- `trainModel(transactions: Transaction[], categories: string[])` method
- `predictCategory(transaction: Transaction)` method
- `getModelConfidence(prediction: any)` method
- `saveModelToIndexedDB()` and `loadModelFromIndexedDB()` methods

**`src/lib/types/categorization.ts`**
- `CategorizationResult` interface with category, confidence, and alternatives
- `TrainingData` interface for structured training data
- `ModelMetadata` interface for model versioning and performance metrics

**`src/components/CategorizationTrainer.tsx`**
- React component for training the ML model
- Input fields for 2 Google Sheets URLs containing historical categorized data
- URL validation and parsing (extract spreadsheet ID from Google Sheets URLs)
- Data fetching from multiple Google Sheets sources
- Progress indicators for training process
- Model performance metrics display
- Training data validation and preview
- Data source selection and management

**`src/components/CategorizationPredictor.tsx`**
- React component for displaying categorization suggestions
- Confidence score visualization
- Manual override capabilities
- Batch categorization controls

**`src/lib/utils/text-preprocessing.ts`**
- Text normalization functions for payee and message fields
- Feature extraction utilities
- Tokenization and vectorization helpers

### Files to Modify

**`src/lib/types/transaction.ts`**
- Add `category?: string` field to Transaction class
- Add `predictedCategory?: string` field for ML predictions
- Add `categoryConfidence?: number` field for confidence scores

**`src/lib/services/google-sheets-service.ts`**
- Modify `mapRowsToTransactions()` to include category column (row[8])
- Modify `mapTransactionsToRows()` to include category in output
- Add `getHistoricalTransactionsWithCategories()` method to fetch training data
- Add `fetchTransactionsFromMultipleSheets()` method to aggregate data from multiple Google Sheets
- Add `parseGoogleSheetsUrl()` method to extract spreadsheet ID from Google Sheets URLs
- Add `validateGoogleSheetsAccess()` method to verify access to provided URLs

**`src/components/MultiBankFileUpload.tsx`**
- Integrate categorization prediction after transaction parsing
- Add UI for reviewing and confirming categorization suggestions
- Store categorization results in upload summaries

**`package.json`**
- Add `@tensorflow/tfjs: ^4.15.0` dependency

## Algorithm Implementation

### Phase 1: Data Layer and Types

1. **Transaction Data Enhancement**
   - Extend Transaction class with category fields
   - Update Google Sheets service to handle category column
   - Create categorization result types

2. **Historical Data Retrieval**
   - Parse Google Sheets URLs to extract spreadsheet IDs
   - Fetch existing transactions with categories from multiple Google Sheets
   - Validate and clean training data from both sources
   - Handle missing or invalid categories
   - Merge and deduplicate data from multiple sources
   - Validate Google Sheets access permissions for provided URLs

### Phase 2A: Machine Learning Service (Parallel)

1. **Text Preprocessing Pipeline**
   - Normalize payee names (remove special characters, standardize case)
   - Extract features from transaction messages
   - Create numerical representations of text data
   - Handle multi-language text (Finnish, Swedish, English)

2. **Model Architecture**
   - Use TensorFlow.js sequential model with:
     - Input layer for text features (payee + message)
     - Dense layers for feature learning
     - Dropout for regularization
     - Output layer with softmax for category probabilities
   - Implement early stopping to prevent overfitting
   - Use categorical crossentropy loss function

3. **Training Process**
   - Split historical data into training/validation sets (80/20)
   - Implement data augmentation for rare categories
   - Train model with configurable epochs and batch size
   - Monitor training progress and validation accuracy

### Phase 2B: User Interface (Parallel)

1. **Training Interface**
   - Two input fields for Google Sheets URLs containing historical categorized data
   - URL validation with real-time feedback (valid Google Sheets format, accessible)
   - Data fetching progress indicators for each URL
   - Display training data statistics (transaction count, category count)
   - Show training progress with real-time metrics
   - Allow users to review training data from both sources
   - Provide model performance visualization
   - Data source comparison and merging capabilities:
     - Show transaction counts and category counts for each Google Sheets source
     - Display combined totals after merging (e.g., "Sheet 1: 1,200 transactions, Sheet 2: 800 transactions, Combined: 2,000 transactions")
     - Remove duplicates automatically during data merging process

2. **Prediction Interface**
   - Show categorization suggestions with confidence scores
   - Allow manual category override
   - Batch processing for multiple transactions
   - Export/import categorization rules

### Phase 3: Integration and Optimization

1. **Workflow Integration**
   - Automatically trigger categorization after file upload
   - Seamlessly integrate with existing Google Sheets workflow
   - Handle edge cases (new categories, low confidence predictions)

2. **Performance Optimization**
   - Implement model caching in IndexedDB with versioning
   - Lazy load TensorFlow.js to reduce initial bundle size
   - Optimize training data size for browser memory constraints
   - Store model metadata (training date, accuracy, categories) in IndexedDB

## Technical Considerations

### Browser-Only Implementation
- Use TensorFlow.js for client-side machine learning
- Store trained models in IndexedDB for larger storage capacity and better performance
- Implement fallback for browsers without WebGL support
- Handle memory constraints for large training datasets
- Model persistence with versioning and metadata storage

### Data Privacy
- All processing happens in the browser (no data sent to external servers)
- Training data remains in user's Google Sheets
- Models stored locally in IndexedDB

### Model Performance
- Target accuracy of 80%+ for common categories
- Implement confidence thresholds (suggestions only if confidence > 0.7)
- Handle new categories gracefully (suggest "Other" category)
- Provide model retraining capabilities when user corrections are made

### Integration Points
- Hook into existing file upload workflow in `MultiBankFileUpload.tsx`
- Extend Google Sheets service to handle category column
- Maintain backward compatibility with existing transaction structure
- Preserve manual categorization capabilities alongside ML suggestions
