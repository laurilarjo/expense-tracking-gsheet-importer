
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Extract spreadsheet ID from input.
 * Accepts: raw ID, or full URL (with /edit, ?gid=..., #gid=... etc.).
 */
function normalizeSpreadsheetId(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return trimmed;
  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const pathname = new URL(trimmed).pathname;
      const match = pathname.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
      if (match) return match[1];
    } catch {
      // fall through to regex on string
    }
  }
  const pathMatch = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (pathMatch) return pathMatch[1];
  return trimmed;
}

/** Extract sheet name from A1 range (e.g. "Sheet1!A1:E10" -> "Sheet1"). */
function getSheetNameFromRange(range: string): string | null {
  const trimmed = range.trim();
  if (!trimmed.includes("!")) return null;
  return trimmed.split("!")[0].trim() || null;
}

// Direct Google Sheets API function (no Firebase needed)
const readGoogleSheetDirect = async (
  spreadsheetId: string,
  range: string,
  accessToken: string
): Promise<string[][]> => {
  const id = normalizeSpreadsheetId(spreadsheetId);
  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${id}/values/${range}`,
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorMessage = errorData.error?.message || response.statusText;
    throw new Error(`Failed to read Google Sheet: ${errorMessage}`);
  }

  const data = await response.json();
  return data.values || [];
};

export const GoogleSheetsReader = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [spreadsheetId, setSpreadsheetId] = useState("");
  const [range, setRange] = useState("Sheet1!A1:E10");
  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState<string[][] | null>(null);

  const handleReadSheet = async () => {
    if (!spreadsheetId) {
      toast({
        title: "Missing Information",
        description: "Please enter a Spreadsheet ID",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    setData(null);

    try {
      // Get the token from localStorage
      const tokenData = localStorage.getItem("google_sheets_token");
      if (!tokenData) {
        toast({
          title: "Authorization Required",
          description: "Please authorize Google Sheets access first",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      const { token } = JSON.parse(tokenData);
      
      // Use direct Google Sheets API call (no Firebase needed)
      const sheetData = await readGoogleSheetDirect(spreadsheetId, range, token);
      
      setData(sheetData);
      toast({
        title: "Success",
        description: "Sheet data retrieved successfully",
      });
    } catch (error: unknown) {
      console.error("Error reading sheet:", error);
      const rawMessage = error instanceof Error ? error.message : "Failed to read Google Sheet";
      const sheetName = getSheetNameFromRange(range);
      const isSheetNotFound =
        rawMessage.includes("Unable to parse range") ||
        (rawMessage.toLowerCase().includes("sheet") && rawMessage.toLowerCase().includes("not found"));
      const description =
        sheetName && isSheetNotFound
          ? `Could not find the sheet named ${sheetName}`
          : rawMessage;
      toast({
        title: "Error",
        description,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Read Google Sheet</CardTitle>
        <CardDescription>
          Test Google Sheets API access and read data from your spreadsheets
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="spreadsheet-id">Spreadsheet ID</Label>
          <Input
            id="spreadsheet-id"
            placeholder="Paste full sheet URL or just the spreadsheet ID"
            value={spreadsheetId}
            onChange={(e) => setSpreadsheetId(e.target.value)}
          />
          <p className="text-xs text-gray-500">
            Paste the full URL or the ID from: https://docs.google.com/spreadsheets/d/
            <span className="font-medium">SPREADSHEET_ID</span>/edit
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="range">Range (optional)</Label>
          <Input
            id="range"
            placeholder="e.g., Sheet1!A1:E10"
            value={range}
            onChange={(e) => setRange(e.target.value)}
          />
        </div>

        <Button 
          onClick={handleReadSheet} 
          disabled={isLoading || !spreadsheetId} 
          className="w-full"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Loading...
            </>
          ) : (
            "Read Sheet Data"
          )}
        </Button>

        {data && (
          <>
            <Separator className="my-4" />
            <div className="space-y-2">
              <h3 className="font-medium">Sheet Data:</h3>
              <div className="max-h-60 overflow-auto rounded border border-gray-200 p-2">
                <pre className="text-xs">{JSON.stringify(data, null, 2)}</pre>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};
