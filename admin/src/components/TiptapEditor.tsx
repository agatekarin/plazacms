"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import TiptapToolbar from "./TiptapToolbar";

// Ekstensi kustom untuk mengizinkan atribut 'class' pada semua node
import { Extension } from '@tiptap/core';
import { useState } from "react";

const AllowClassAttribute = Extension.create({
  name: 'allowClassAttribute',
  addGlobalAttributes() {
    return [
      {
        types: [
          'heading',
          'paragraph',
          'blockquote',
          'listItem',
          'bulletList',
          'orderedList',
        ],
        attributes: {
          class: {
            default: null,
          },
        },
      },
    ];
  },
});

interface TiptapEditorProps {
  content: string;
  onChange: (richText: string) => void;
}

export default function TiptapEditor({ content, onChange }: TiptapEditorProps) {
  const [viewMode, setViewMode] = useState<"wysiwyg" | "html">("wysiwyg");

  const editor = useEditor({
    extensions: [
      StarterKit.configure(),
      AllowClassAttribute, // Tambahkan ekstensi global kita
      Image.configure({
        inline: false, // Allows images to be on their own line
      }),
      Link.configure({
        openOnClick: false, // Open links in a new tab
        autolink: true,
      }),
    ],
    content: content,
    immediatelyRender: false, // Fix for SSR hydration error
    editorProps: {
      attributes: {
        class:
          "p-4 min-h-[200px] focus:outline-none",
      },
    },
    onUpdate({ editor }) {
      onChange(editor.getHTML());
    },
  });

  const toggleViewMode = () => {
    setViewMode(prev => prev === "wysiwyg" ? "html" : "wysiwyg");
  };

  // When switching from HTML back to WYSIWYG, update the editor content
  const handleHtmlChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = event.target.value;
    onChange(newContent);
    if (editor) {
      editor.commands.setContent(newContent, { emitUpdate: false }); // Correctly pass options object
    }
  };

  return (
    <div className="flex flex-col border border-gray-200 rounded-lg">
      <TiptapToolbar editor={editor} viewMode={viewMode} toggleViewMode={toggleViewMode} />
      {viewMode === 'wysiwyg' ? (
        <EditorContent editor={editor} />
      ) : (
        <textarea
          value={content}
          onChange={handleHtmlChange}
          className="w-full h-96 p-4 font-mono text-sm bg-gray-50 border-t border-gray-200 focus:outline-none resize-y"
          placeholder="Enter HTML content..."
        />
      )}
    </div>
  );
}
