import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface WorkflowStepProps {
  step: number;
  title: string;
  description?: string;
  enabled: boolean;
  completed?: boolean;
  children: React.ReactNode;
}

export const WorkflowStep: React.FC<WorkflowStepProps> = ({
  step,
  title,
  description,
  enabled,
  completed = false,
  children,
}) => {
  return (
    <Card
      className={cn(
        'w-full shadow-lg animate-fade-in transition-opacity',
        !enabled && 'opacity-55'
      )}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          <div
            className={cn(
              'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold',
              completed
                ? 'bg-green-600 text-white'
                : enabled
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground'
            )}
            aria-hidden
          >
            {completed ? <Check className="h-4 w-4" /> : step}
          </div>
          <div className="min-w-0 space-y-1">
            <CardTitle className="text-xl">{title}</CardTitle>
            {description && <CardDescription>{description}</CardDescription>}
            {!enabled && (
              <p className="text-xs text-muted-foreground">
                Complete the previous step to unlock this one.
              </p>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent
        className={cn(!enabled && 'pointer-events-none select-none')}
        aria-disabled={!enabled}
      >
        {children}
      </CardContent>
    </Card>
  );
};
