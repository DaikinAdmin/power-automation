'use client';

import React, { JSX } from 'react';

interface EditorBlock {
  type: string;
  data: any;
}

interface EditorJSData {
  blocks: EditorBlock[];
  version?: string;
  time?: number;
}

interface EditorJSRendererProps {
  data: EditorJSData;
  className?: string;
}

export default function EditorJSRenderer({ data, className = '' }: EditorJSRendererProps) {
  if (!data || !data.blocks) {
    return null;
  }

  const renderBlock = (block: EditorBlock, index: number) => {
    const { type, data: blockData } = block;

    switch (type) {
      case 'header':
        const HeaderTag = `h${blockData.level || 2}` as keyof JSX.IntrinsicElements;
        return (
          <HeaderTag key={index} className="font-bold my-4">
            {blockData.text}
          </HeaderTag>
        );

      case 'paragraph':
        return (
          <p key={index} className="my-3 text-gray-700 leading-relaxed" dangerouslySetInnerHTML={{ __html: blockData.text }} />
        );

      case 'list':
        if (blockData.style === 'ordered') {
          return (
            <ol key={index} className="list-decimal list-inside my-4 space-y-2">
              {blockData.items.map((item: string, i: number) => (
                <li key={i} className="text-gray-700">{item}</li>
              ))}
            </ol>
          );
        }
        return (
          <ul key={index} className="list-disc list-inside my-4 space-y-2">
            {blockData.items.map((item: string, i: number) => (
              <li key={i} className="text-gray-700">{item}</li>
            ))}
          </ul>
        );

      case 'quote':
        return (
          <blockquote key={index} className="border-l-4 border-gray-300 pl-4 my-4 italic text-gray-600">
            <p>{blockData.text}</p>
            {blockData.caption && (
              <cite className="block mt-2 text-sm text-gray-500">— {blockData.caption}</cite>
            )}
          </blockquote>
        );

      case 'code':
        return (
          <pre key={index} className="bg-gray-100 p-4 rounded my-4 overflow-x-auto">
            <code className="text-sm">{blockData.code}</code>
          </pre>
        );

      case 'warning':
        return (
          <div key={index} className="bg-yellow-50 border-l-4 border-yellow-400 p-4 my-4">
            <p className="font-bold text-yellow-800">{blockData.title}</p>
            <p className="text-yellow-700">{blockData.message}</p>
          </div>
        );

      case 'delimiter':
        return (
          <div key={index} className="flex justify-center my-6">
            <span className="text-2xl text-gray-400">***</span>
          </div>
        );

      case 'raw':
        return (
          <div key={index} className="my-4" dangerouslySetInnerHTML={{ __html: blockData.html }} />
        );

      case 'table':
        return (
          <div key={index} className="overflow-x-auto my-4">
            <table className="min-w-full border border-gray-300">
              <tbody>
                {blockData.content.map((row: string[], rowIndex: number) => (
                  <tr key={rowIndex} className="border-b border-gray-200">
                    {row.map((cell: string, cellIndex: number) => (
                      <td key={cellIndex} className="px-4 py-2 border-r border-gray-200">
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );

      case 'checklist':
        return (
          <div key={index} className="my-4 space-y-2">
            {blockData.items.map((item: { text: string; checked: boolean }, i: number) => (
              <div key={i} className="flex items-center">
                <input
                  type="checkbox"
                  checked={item.checked}
                  readOnly
                  className="mr-2"
                />
                <span className={item.checked ? 'line-through text-gray-500' : 'text-gray-700'}>
                  {item.text}
                </span>
              </div>
            ))}
          </div>
        );

      default:
        console.warn(`Unknown block type: ${type}`, blockData);
        return null;
    }
  };

  return (
    <div className={`editor-js-content ${className}`}>
      {data.blocks.map((block, index) => renderBlock(block, index))}
    </div>
  );
}
