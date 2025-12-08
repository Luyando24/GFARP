import React from 'react';
import { 
    Bold, Italic, List, ListOrdered, Link as LinkIcon, Image as ImageIcon, 
    Quote, Code, Heading1, Heading2, Undo, Redo 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

interface MarkdownEditorProps {
    value: string;
    onChange: (value: string) => void;
    className?: string;
}

export function MarkdownEditor({ value, onChange, className }: MarkdownEditorProps) {
    const textareaRef = React.useRef<HTMLTextAreaElement>(null);

    const insertFormat = (startTag: string, endTag: string = '') => {
        const textarea = textareaRef.current;
        if (!textarea) return;

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const text = textarea.value;
        const before = text.substring(0, start);
        const selection = text.substring(start, end);
        const after = text.substring(end);

        const newText = `${before}${startTag}${selection}${endTag}${after}`;
        onChange(newText);

        // Restore selection (wrapping the inserted text)
        setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(start + startTag.length, end + startTag.length);
        }, 0);
    };

    const insertLineFormat = (prefix: string) => {
        const textarea = textareaRef.current;
        if (!textarea) return;

        const start = textarea.selectionStart;
        const text = textarea.value;
        
        // Find start of current line
        let lineStart = text.lastIndexOf('\n', start - 1) + 1;
        if (lineStart === -1) lineStart = 0;

        const before = text.substring(0, lineStart);
        const after = text.substring(lineStart);

        const newText = `${before}${prefix}${after}`;
        onChange(newText);
        
        setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(start + prefix.length, start + prefix.length);
        }, 0);
    };

    return (
        <div className={cn("border border-input rounded-md bg-background", className)}>
            <div className="flex flex-wrap items-center gap-1 p-2 border-b bg-muted/30">
                <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => insertFormat('**', '**')} title="Bold">
                    <Bold className="h-4 w-4" />
                </Button>
                <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => insertFormat('*', '*')} title="Italic">
                    <Italic className="h-4 w-4" />
                </Button>
                <div className="w-px h-4 bg-border mx-1" />
                <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => insertLineFormat('# ')} title="Heading 1">
                    <Heading1 className="h-4 w-4" />
                </Button>
                <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => insertLineFormat('## ')} title="Heading 2">
                    <Heading2 className="h-4 w-4" />
                </Button>
                <div className="w-px h-4 bg-border mx-1" />
                <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => insertLineFormat('- ')} title="Bullet List">
                    <List className="h-4 w-4" />
                </Button>
                <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => insertLineFormat('1. ')} title="Numbered List">
                    <ListOrdered className="h-4 w-4" />
                </Button>
                <div className="w-px h-4 bg-border mx-1" />
                <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => insertFormat('> ')} title="Quote">
                    <Quote className="h-4 w-4" />
                </Button>
                <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => insertFormat('`', '`')} title="Inline Code">
                    <Code className="h-4 w-4" />
                </Button>
                <div className="w-px h-4 bg-border mx-1" />
                <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => insertFormat('[', '](url)')} title="Link">
                    <LinkIcon className="h-4 w-4" />
                </Button>
                <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => insertFormat('![alt text](', ')')} title="Image">
                    <ImageIcon className="h-4 w-4" />
                </Button>
            </div>
            <Textarea 
                ref={textareaRef}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="min-h-[400px] border-0 focus-visible:ring-0 resize-y rounded-none rounded-b-md font-mono text-sm p-4"
                placeholder="Start writing your amazing article..."
            />
        </div>
    );
}
