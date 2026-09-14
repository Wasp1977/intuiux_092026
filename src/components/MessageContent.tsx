'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import mermaid from 'mermaid';
import ReactMarkdown from 'react-markdown';
import { Search } from 'lucide-react';

// Инициализация mermaid — тёмная тема
if (typeof window !== 'undefined') {
  mermaid.initialize({
    startOnLoad: false,
    theme: 'dark',
    themeVariables: {
      primaryColor: '#3b82f6',
      primaryTextColor: '#e2e8f0',
      primaryBorderColor: '#475569',
      lineColor: '#64748b',
      secondaryColor: '#1e293b',
      tertiaryColor: '#0f172a',
      background: '#0f172a',
      mainBkg: '#1e293b',
      nodeBorder: '#475569',
      clusterBkg: '#1e293b',
      clusterBorder: '#334155',
      titleColor: '#e2e8f0',
      edgeLabelBackground: '#1e293b',
      nodeTextColor: '#e2e8f0',
      fontSize: '14px',
    },
    flowchart: {
      useMaxWidth: true,
      htmlLabels: true,
      curve: 'basis',
      padding: 15,
    },
    sequence: {
      useMaxWidth: true,
      actorMargin: 50,
      messageMargin: 35,
    },
    journey: {
      useMaxWidth: true,
    },
    securityLevel: 'loose'
  });
}

interface MermaidDiagramProps {
  chart: string;
  stageId?: string;
}

function MermaidDiagram({ chart, stageId }: MermaidDiagramProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>('');
  const [error, setError] = useState<boolean>(false);

  useEffect(() => {
    const render = async () => {
      try {
        const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;
        const { svg } = await mermaid.render(id, chart);
        setSvg(svg);
        setError(false);
      } catch {
        setError(true);
      }
    };
    render();
  }, [chart]);

  // Цвет акцента по этапу
  const accentColors: Record<string, string> = {
    idea: 'from-amber-500/10 to-yellow-500/10 border-amber-500/20',
    competitors: 'from-orange-500/10 to-red-500/10 border-orange-500/20',
    cjm: 'from-emerald-500/10 to-teal-500/10 border-emerald-500/20',
    ia: 'from-cyan-500/10 to-blue-500/10 border-cyan-500/20',
    userflow: 'from-blue-500/10 to-indigo-500/10 border-blue-500/20',
    metrics: 'from-teal-500/10 to-emerald-500/10 border-teal-500/20',
  };
  const accentClass = stageId ? (accentColors[stageId] || 'from-slate-500/10 to-slate-500/10 border-slate-500/20') : 'from-slate-500/10 to-slate-500/10 border-slate-500/20';

  if (error) {
    return (
      <div className="my-3 p-4 bg-red-500/10 border border-red-500/20 rounded-xl overflow-auto">
        <p className="text-red-400 text-xs mb-2 font-medium">Ошибка рендеринга диаграммы</p>
        <pre className="text-xs text-red-300/70 whitespace-pre-wrap">{chart}</pre>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className={`mermaid-diagram my-4 overflow-x-auto rounded-xl p-4 bg-gradient-to-br ${accentClass} border backdrop-blur-sm`}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}

// Auto-resizing iframe for isolated prototype rendering
function PrototypeIframe({ htmlContent }: { htmlContent: string }) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(600);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const handleLoad = () => {
      try {
        const doc = iframe.contentDocument || iframe.contentWindow?.document;
        if (doc?.body) {
          // Wait a tick for layout to settle
          setTimeout(() => {
            const h = doc.body.scrollHeight || doc.documentElement.scrollHeight || 600;
            setHeight(Math.min(Math.max(h, 300), 2000));
          }, 100);
        }
      } catch {
        // Cross-origin — keep default height
      }
    };

    iframe.addEventListener('load', handleLoad);
    return () => iframe.removeEventListener('load', handleLoad);
  }, [htmlContent]);

  return (
    <div className="prototype-iframe-container rounded-xl overflow-hidden border border-white/10">
      <iframe
        ref={iframeRef}
        srcDoc={htmlContent}
        className="prototype-iframe w-full border-0"
        style={{ height: `${height}px` }}
        sandbox="allow-scripts allow-same-origin"
        title="Прототип"
      />
    </div>
  );
}

interface MessageContentProps {
  content: string;
  stageId?: string;
  zoomLevel?: number;
}

export function MessageContent({ content, stageId, zoomLevel = 100 }: MessageContentProps) {
  const hasSearchPerformed = stageId === 'competitors' && content.includes('"searchPerformed": true');
  
  // Проверяем, является ли контент HTML (для прототипа)
  const isHtmlContent = content.includes('<!DOCTYPE') || (content.includes('<html') && content.includes('</html>'));

  const parseContent = (text: string) => {
    const parts: Array<{ type: 'text' | 'mermaid'; content: string; key: string }> = [];
    const mermaidRegex = /```mermaid\n([\s\S]*?)```/g;
    
    let lastIndex = 0;
    let match;
    let keyIndex = 0;
    
    while ((match = mermaidRegex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push({
          type: 'text',
          content: text.slice(lastIndex, match.index),
          key: `text-${keyIndex++}`
        });
      }
      
      parts.push({
        type: 'mermaid',
        content: match[1].trim(),
        key: `mermaid-${keyIndex++}`
      });
      
      lastIndex = match.index + match[0].length;
    }
    
    if (lastIndex < text.length) {
      parts.push({
        type: 'text',
        content: text.slice(lastIndex),
        key: `text-${keyIndex++}`
      });
    }
    
    return parts.length > 0 ? parts : [{ type: 'text' as const, content: text, key: 'text-0' }];
  };

  const parts = parseContent(content);

  return (
    <div 
      className="message-content"
      style={zoomLevel !== 100 ? { transform: `scale(${zoomLevel / 100})`, transformOrigin: 'top left' } : undefined}
    >
      {hasSearchPerformed && (
        <div className="mb-4 p-3 bg-gradient-to-r from-blue-500/10 to-cyan-500/10 rounded-lg border border-blue-200/30">
          <div className="flex items-center gap-2">
            <Search className="w-5 h-5 text-blue-400" />
            <span className="text-blue-300 text-sm font-medium">Веб-поиск конкурентов</span>
          </div>
        </div>
      )}
      {/* HTML контент (прототип) рендерим в изолированном iframe */}
      {isHtmlContent ? (
        <PrototypeIframe htmlContent={content} />
      ) : (
        /* Markdown + Mermaid контент */
        parts.map((part) => (
          part.type === 'mermaid' ? (
            <MermaidDiagram key={part.key} chart={part.content} stageId={stageId} />
          ) : (
            <div key={part.key} className="prose prose-sm prose-invert prose-slate max-w-none 
              prose-headings:text-slate-100 prose-headings:font-semibold
              prose-h1:text-2xl prose-h1:mb-4 prose-h1:mt-6
              prose-h2:text-xl prose-h2:mb-3 prose-h2:mt-5 
              prose-h3:text-lg prose-h3:mb-2 prose-h3:mt-4
              prose-p:text-slate-300 prose-p:my-2 prose-p:leading-relaxed
              prose-ul:my-2 prose-ol:my-2 
              prose-li:text-slate-300 prose-li:my-1
              prose-strong:text-slate-100 prose-strong:font-semibold
              prose-table:my-2 
              prose-th:py-2 prose-th:px-3 prose-th:bg-slate-800 prose-th:text-slate-200
              prose-td:py-2 prose-td:px-3 prose-td:border-slate-700
              prose-code:text-cyan-300 prose-code:bg-slate-800 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm
              prose-pre:bg-slate-900 prose-pre:border prose-pre:border-slate-700 prose-pre:rounded-xl
              prose-blockquote:border-l-4 prose-blockquote:border-amber-500/40 prose-blockquote:bg-amber-500/5 prose-blockquote:py-2 prose-blockquote:px-4 prose-blockquote:rounded-r-lg
              prose-a:text-cyan-400 prose-a:no-underline hover:prose-a:underline
            ">
              <ReactMarkdown>
                {part.content}
              </ReactMarkdown>
            </div>
          )
        ))
      )}
    </div>
  );
}
