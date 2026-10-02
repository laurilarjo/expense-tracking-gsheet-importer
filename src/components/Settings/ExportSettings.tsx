import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useSettings } from '@/contexts/SettingsContext';
import { useToast } from '@/hooks/use-toast';
import { Check, Copy, Download } from 'lucide-react';

export const ExportSettings: React.FC = () => {
  const { settings } = useSettings();
  const { toast } = useToast();
  const [exportedJson, setExportedJson] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleExportAll = () => {
    const json = JSON.stringify(settings, null, 2);
    setExportedJson(json);
    setCopied(false);
  };

  const handleCopy = async () => {
    if (!exportedJson) return;

    try {
      await navigator.clipboard.writeText(exportedJson);
      setCopied(true);
      toast({
        title: 'Copied',
        description: 'Settings JSON copied to clipboard.',
      });
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({
        title: 'Copy failed',
        description: 'Could not copy to clipboard. Select the text and copy manually.',
        variant: 'destructive',
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Download className="h-5 w-5" />
          Export Settings
        </CardTitle>
        <CardDescription>
          Export your current settings (users, sheet ID, and related options) as JSON so you can back them up or move them to another browser.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button onClick={handleExportAll} variant="outline">
          Export all
        </Button>

        {exportedJson !== null && (
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="export-settings-json">Settings JSON</Label>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={handleCopy}
                className="shrink-0"
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4 mr-1" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-1" />
                    Copy to clipboard
                  </>
                )}
              </Button>
            </div>
            <Textarea
              id="export-settings-json"
              value={exportedJson}
              readOnly
              className="min-h-[160px] font-mono text-xs"
              onFocus={(e) => e.target.select()}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
};
