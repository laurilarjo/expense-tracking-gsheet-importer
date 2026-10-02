import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useSettings } from '@/contexts/SettingsContext';
import { useToast } from '@/hooks/use-toast';
import { AppSettings } from '@/lib/types/settings';
import { Bank } from '@/lib/types/bank';
import { Upload } from 'lucide-react';

function parseSettingsJson(raw: string): AppSettings {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('Invalid JSON — check for missing commas or quotes.');
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Settings must be a JSON object.');
  }

  const obj = parsed as Record<string, unknown>;

  if (!Array.isArray(obj.users)) {
    throw new Error('Missing or invalid "users" array.');
  }

  const users = obj.users.map((user, index) => {
    if (!user || typeof user !== 'object' || Array.isArray(user)) {
      throw new Error(`User at index ${index} is invalid.`);
    }
    const u = user as Record<string, unknown>;
    if (typeof u.id !== 'string' || !u.id) {
      throw new Error(`User at index ${index} needs a string "id".`);
    }
    if (typeof u.name !== 'string' || !u.name) {
      throw new Error(`User at index ${index} needs a string "name".`);
    }
    if (!Array.isArray(u.allowedBanks) || !u.allowedBanks.every((b) => typeof b === 'string')) {
      throw new Error(`User at index ${index} needs an "allowedBanks" string array.`);
    }
    return {
      id: u.id,
      name: u.name,
      allowedBanks: u.allowedBanks as Bank[],
    };
  });

  if (obj.googleSheetsId !== undefined && typeof obj.googleSheetsId !== 'string') {
    throw new Error('"googleSheetsId" must be a string.');
  }

  if (
    obj.lastSelectedUser !== undefined &&
    obj.lastSelectedUser !== null &&
    typeof obj.lastSelectedUser !== 'string'
  ) {
    throw new Error('"lastSelectedUser" must be a string.');
  }

  if (
    obj.exchangeratesApiKey !== undefined &&
    obj.exchangeratesApiKey !== null &&
    typeof obj.exchangeratesApiKey !== 'string'
  ) {
    throw new Error('"exchangeratesApiKey" must be a string.');
  }

  return {
    users,
    googleSheetsId: typeof obj.googleSheetsId === 'string' ? obj.googleSheetsId : '',
    lastSelectedUser:
      typeof obj.lastSelectedUser === 'string' ? obj.lastSelectedUser : undefined,
    exchangeratesApiKey:
      typeof obj.exchangeratesApiKey === 'string' ? obj.exchangeratesApiKey : '',
  };
}

export const ImportSettings: React.FC = () => {
  const { replaceSettings } = useSettings();
  const { toast } = useToast();
  const [jsonText, setJsonText] = useState('');
  const [isImporting, setIsImporting] = useState(false);

  const handleImport = () => {
    setIsImporting(true);
    try {
      const settings = parseSettingsJson(jsonText.trim());
      replaceSettings(settings);
      setJsonText('');
      toast({
        title: 'Settings imported',
        description: `Restored ${settings.users.length} user(s) and Google Sheets config.`,
      });
    } catch (error) {
      toast({
        title: 'Import failed',
        description: error instanceof Error ? error.message : 'Could not import settings.',
        variant: 'destructive',
      });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Import Settings
        </CardTitle>
        <CardDescription>
          Paste a previously exported <code className="text-xs">lala-expense-tracker-settings</code>{' '}
          localStorage value to restore users, sheet ID, and related options. This replaces your current settings.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="settings-json">Settings JSON</Label>
          <Textarea
            id="settings-json"
            value={jsonText}
            onChange={(e) => setJsonText(e.target.value)}
            placeholder='{"users":[...],"googleSheetsId":"...","lastSelectedUser":"...","exchangeratesApiKey":"..."}'
            className="min-h-[160px] font-mono text-xs"
          />
        </div>
        <Button onClick={handleImport} disabled={!jsonText.trim() || isImporting}>
          {isImporting ? 'Importing…' : 'Import settings'}
        </Button>
      </CardContent>
    </Card>
  );
};
