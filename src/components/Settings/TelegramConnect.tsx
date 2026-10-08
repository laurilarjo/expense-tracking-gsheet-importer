import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useSettings } from '@/contexts/SettingsContext';
import {
  createTelegramLink,
  fetchWorkspaceInfo,
  syncWorkspaceSettings,
} from '@/lib/services/workspace-sync-client';
import { ExternalLink, Link2, RefreshCw } from 'lucide-react';

export const TelegramConnect: React.FC = () => {
  const { settings } = useSettings();
  const { toast } = useToast();
  const [deepLink, setDeepLink] = useState<string | null>(null);
  const [serviceAccountEmail, setServiceAccountEmail] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetchWorkspaceInfo()
      .then((info) => setServiceAccountEmail(info.serviceAccountEmail))
      .catch(() => {
        /* not synced yet */
      });
  }, []);

  const handleSync = async () => {
    setBusy(true);
    try {
      await syncWorkspaceSettings(settings);
      const info = await fetchWorkspaceInfo();
      setServiceAccountEmail(info.serviceAccountEmail);
      toast({
        title: 'Workspace synced',
        description: 'Settings are available to the Telegram bot.',
      });
    } catch (error) {
      toast({
        title: 'Sync failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setBusy(false);
    }
  };

  const handleConnect = async () => {
    setBusy(true);
    try {
      await syncWorkspaceSettings(settings);
      const { deepLink: link } = await createTelegramLink();
      setDeepLink(link);
      toast({
        title: 'Link ready',
        description: 'Open the Telegram link and tap Start.',
      });
    } catch (error) {
      toast({
        title: 'Could not create link',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="w-full shadow-lg animate-fade-in">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Link2 className="h-5 w-5" />
          Telegram bot
        </CardTitle>
        <CardDescription>
          Sync settings for the bot, share your sheet with the service account, then Connect
          Telegram. Add the bot to a channel (or tap Join if it is already there).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {serviceAccountEmail && (
          <div className="rounded-md border p-3 text-sm">
            <p className="font-medium">Share your spreadsheet with this email (Editor):</p>
            <code className="break-all text-xs">{serviceAccountEmail}</code>
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={handleSync} disabled={busy}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Sync settings to bot
          </Button>
          <Button type="button" onClick={handleConnect} disabled={busy}>
            Connect Telegram
          </Button>
        </div>
        {deepLink && (
          <a
            href={deepLink}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 text-sm text-primary underline"
          >
            Open Telegram to finish linking
            <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </CardContent>
    </Card>
  );
};
