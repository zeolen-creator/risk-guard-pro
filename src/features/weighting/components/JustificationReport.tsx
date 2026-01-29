import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileText, Download, Copy, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface JustificationReportProps {
  executiveReport: string;
  detailedReport: string;
  technicalReport: string;
}

export function JustificationReport({
  executiveReport,
  detailedReport,
  technicalReport,
}: JustificationReportProps) {
  const { toast } = useToast();
  const [copiedTab, setCopiedTab] = useState<string | null>(null);

  const handleCopy = async (content: string, tabName: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedTab(tabName);
      toast({
        title: "Copied",
        description: `${tabName} report copied to clipboard`,
      });
      setTimeout(() => setCopiedTab(null), 2000);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy to clipboard",
        variant: "destructive",
      });
    }
  };

  const handleDownload = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Downloaded",
      description: `${filename} downloaded successfully`,
    });
  };

  const renderMarkdown = (content: string) => {
    // Simple markdown rendering - convert headers, bold, lists
    if (!content) return <p className="text-muted-foreground">No report available</p>;

    const lines = content.split('\n');
    return lines.map((line, index) => {
      // Headers
      if (line.startsWith('# ')) {
        return <h1 key={index} className="text-2xl font-bold mt-6 mb-3">{line.slice(2)}</h1>;
      }
      if (line.startsWith('## ')) {
        return <h2 key={index} className="text-xl font-semibold mt-5 mb-2">{line.slice(3)}</h2>;
      }
      if (line.startsWith('### ')) {
        return <h3 key={index} className="text-lg font-medium mt-4 mb-2">{line.slice(4)}</h3>;
      }
      // Horizontal rule
      if (line.startsWith('---')) {
        return <hr key={index} className="my-4" />;
      }
      // List items
      if (line.startsWith('- ')) {
        return <li key={index} className="ml-4">{line.slice(2)}</li>;
      }
      // Bold text
      if (line.includes('**')) {
        const parts = line.split(/\*\*(.*?)\*\*/g);
        return (
          <p key={index} className="my-1">
            {parts.map((part, i) => 
              i % 2 === 1 ? <strong key={i}>{part}</strong> : part
            )}
          </p>
        );
      }
      // Empty lines
      if (line.trim() === '') {
        return <br key={index} />;
      }
      // Regular text
      return <p key={index} className="my-1">{line}</p>;
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Justification Reports
        </CardTitle>
        <CardDescription>
          Comprehensive documentation for stakeholders, auditors, and technical review
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="executive">
          <div className="flex items-center justify-between mb-4">
            <TabsList>
              <TabsTrigger value="executive">Executive</TabsTrigger>
              <TabsTrigger value="detailed">Detailed</TabsTrigger>
              <TabsTrigger value="technical">Technical</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="executive">
            <div className="flex gap-2 mb-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleCopy(executiveReport, 'Executive')}
              >
                {copiedTab === 'Executive' ? (
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                ) : (
                  <Copy className="h-4 w-4 mr-2" />
                )}
                Copy
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDownload(executiveReport, 'executive-report.md')}
              >
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
            </div>
            <ScrollArea className="h-[500px] rounded-lg border p-4 bg-muted/30">
              <div className="prose prose-sm dark:prose-invert max-w-none">
                {renderMarkdown(executiveReport)}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="detailed">
            <div className="flex gap-2 mb-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleCopy(detailedReport, 'Detailed')}
              >
                {copiedTab === 'Detailed' ? (
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                ) : (
                  <Copy className="h-4 w-4 mr-2" />
                )}
                Copy
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDownload(detailedReport, 'detailed-report.md')}
              >
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
            </div>
            <ScrollArea className="h-[500px] rounded-lg border p-4 bg-muted/30">
              <div className="prose prose-sm dark:prose-invert max-w-none">
                {renderMarkdown(detailedReport)}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="technical">
            <div className="flex gap-2 mb-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleCopy(technicalReport, 'Technical')}
              >
                {copiedTab === 'Technical' ? (
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                ) : (
                  <Copy className="h-4 w-4 mr-2" />
                )}
                Copy
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDownload(technicalReport, 'technical-report.md')}
              >
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
            </div>
            <ScrollArea className="h-[500px] rounded-lg border p-4 bg-muted/30">
              <div className="prose prose-sm dark:prose-invert max-w-none font-mono text-xs">
                {renderMarkdown(technicalReport)}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
