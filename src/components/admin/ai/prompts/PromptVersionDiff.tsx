// ============================================
// Prompt Version Diff Component
// ============================================

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { GitCompare, Plus, Minus, Equal } from 'lucide-react';

interface DiffLine {
  type: 'added' | 'removed' | 'unchanged';
  content: string;
  lineNumber: { old?: number; new?: number };
}

interface PromptVersionDiffProps {
  oldContent: string;
  newContent: string;
  oldVersion: number;
  newVersion: number;
}

export function PromptVersionDiff({ 
  oldContent, 
  newContent, 
  oldVersion, 
  newVersion 
}: PromptVersionDiffProps) {
  // Simple line-by-line diff
  const diffLines = useMemo(() => {
    const oldLines = oldContent.split('\n');
    const newLines = newContent.split('\n');
    const result: DiffLine[] = [];

    // Simple LCS-based diff
    const lcs = computeLCS(oldLines, newLines);
    
    let oldIdx = 0;
    let newIdx = 0;
    let oldLineNum = 1;
    let newLineNum = 1;

    for (const match of lcs) {
      // Add removed lines
      while (oldIdx < match.oldIndex) {
        result.push({
          type: 'removed',
          content: oldLines[oldIdx],
          lineNumber: { old: oldLineNum }
        });
        oldIdx++;
        oldLineNum++;
      }

      // Add added lines
      while (newIdx < match.newIndex) {
        result.push({
          type: 'added',
          content: newLines[newIdx],
          lineNumber: { new: newLineNum }
        });
        newIdx++;
        newLineNum++;
      }

      // Add unchanged line
      result.push({
        type: 'unchanged',
        content: oldLines[oldIdx],
        lineNumber: { old: oldLineNum, new: newLineNum }
      });
      oldIdx++;
      newIdx++;
      oldLineNum++;
      newLineNum++;
    }

    // Remaining removed lines
    while (oldIdx < oldLines.length) {
      result.push({
        type: 'removed',
        content: oldLines[oldIdx],
        lineNumber: { old: oldLineNum }
      });
      oldIdx++;
      oldLineNum++;
    }

    // Remaining added lines
    while (newIdx < newLines.length) {
      result.push({
        type: 'added',
        content: newLines[newIdx],
        lineNumber: { new: newLineNum }
      });
      newIdx++;
      newLineNum++;
    }

    return result;
  }, [oldContent, newContent]);

  // Calculate stats
  const stats = useMemo(() => {
    const added = diffLines.filter(l => l.type === 'added').length;
    const removed = diffLines.filter(l => l.type === 'removed').length;
    const unchanged = diffLines.filter(l => l.type === 'unchanged').length;
    return { added, removed, unchanged };
  }, [diffLines]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <GitCompare className="h-4 w-4" />
            So sánh v{oldVersion} → v{newVersion}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-green-600 bg-green-500/10">
              <Plus className="h-3 w-3 mr-1" />
              {stats.added}
            </Badge>
            <Badge variant="outline" className="text-red-600 bg-red-500/10">
              <Minus className="h-3 w-3 mr-1" />
              {stats.removed}
            </Badge>
            <Badge variant="outline" className="text-muted-foreground">
              <Equal className="h-3 w-3 mr-1" />
              {stats.unchanged}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px]">
          <div className="font-mono text-sm">
            {diffLines.map((line, index) => (
              <div
                key={index}
                className={`flex ${
                  line.type === 'added' 
                    ? 'bg-green-500/10 text-green-700 dark:text-green-400' 
                    : line.type === 'removed'
                    ? 'bg-red-500/10 text-red-700 dark:text-red-400'
                    : ''
                }`}
              >
                {/* Line numbers */}
                <div className="w-10 text-right pr-2 text-muted-foreground/50 select-none flex-shrink-0 border-r border-border">
                  {line.lineNumber.old || ''}
                </div>
                <div className="w-10 text-right pr-2 text-muted-foreground/50 select-none flex-shrink-0 border-r border-border">
                  {line.lineNumber.new || ''}
                </div>

                {/* Diff indicator */}
                <div className="w-6 text-center flex-shrink-0">
                  {line.type === 'added' && <Plus className="h-4 w-4 mx-auto text-green-600" />}
                  {line.type === 'removed' && <Minus className="h-4 w-4 mx-auto text-red-600" />}
                </div>

                {/* Content */}
                <div className="flex-1 px-2 whitespace-pre-wrap break-all">
                  {line.content || ' '}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

// Helper: Compute Longest Common Subsequence matches
interface LCSMatch {
  oldIndex: number;
  newIndex: number;
}

function computeLCS(oldLines: string[], newLines: string[]): LCSMatch[] {
  const m = oldLines.length;
  const n = newLines.length;

  // Build LCS matrix
  const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (oldLines[i - 1] === newLines[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  // Backtrack to find matches
  const matches: LCSMatch[] = [];
  let i = m, j = n;

  while (i > 0 && j > 0) {
    if (oldLines[i - 1] === newLines[j - 1]) {
      matches.unshift({ oldIndex: i - 1, newIndex: j - 1 });
      i--;
      j--;
    } else if (dp[i - 1][j] > dp[i][j - 1]) {
      i--;
    } else {
      j--;
    }
  }

  return matches;
}
