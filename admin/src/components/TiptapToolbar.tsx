"use client";

import { Editor } from "@tiptap/react";
import {
  Bold,
  Italic,
  Strikethrough,
  Code,
  Heading1,
  Heading2,
  Heading3,
  Pilcrow,
  List,
  ListOrdered,
  Quote,
  Undo,
  Redo,
  Image as ImageIcon,
  Link as LinkIcon,
  CodeXml,
} from "lucide-react";
import { useCallback } from "react";

type Props = {
  editor: Editor | null;
  viewMode: "wysiwyg" | "html";
  toggleViewMode: () => void;
};

const ToolbarButton = ({
  onClick,
  isActive,
  children,
  title,
}: {
  onClick: () => unknown;
  isActive: boolean;
  children: React.ReactNode;
  title?: string;
}) => (
  <button
    onClick={onClick}
    type="button"
    title={title}
    className={`p-2 rounded-md transition-colors ${
      isActive
        ? "bg-blue-500 text-white"
        : "bg-gray-100 hover:bg-gray-200 text-gray-700"
    }`}
  >
    {children}
  </button>
);

export default function TiptapToolbar({ editor, viewMode, toggleViewMode }: Props) {
  const setLink = useCallback(() => {
    if (!editor) return;
    const previousUrl = editor.getAttributes("link").href;
    const url = window.prompt("URL", previousUrl);

    if (url === null) {
      return;
    }

    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }

    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  }, [editor]);

  const addImage = useCallback(() => {
    if (!editor) return;
    const url = window.prompt("Image URL");

    if (url) {
      editor.chain().focus().setImage({ src: url }).run();
    }
  }, [editor]);

  if (!editor) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-2 p-2 border border-b-0 border-gray-200 rounded-t-lg bg-white">
      {viewMode === "wysiwyg" && (
        <>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBold().run()}
            isActive={editor.isActive("bold")}
            title="Bold"
          >
            <Bold size={16} />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleItalic().run()}
            isActive={editor.isActive("italic")}
            title="Italic"
          >
            <Italic size={16} />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleStrike().run()}
            isActive={editor.isActive("strike")}
            title="Strikethrough"
          >
            <Strikethrough size={16} />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleCode().run()}
            isActive={editor.isActive("code")}
            title="Inline Code"
          >
            <Code size={16} />
          </ToolbarButton>

          <div className="w-px h-6 bg-gray-200 mx-1" />

          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            isActive={editor.isActive("heading", { level: 1 })}
            title="Heading 1"
          >
            <Heading1 size={16} />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            isActive={editor.isActive("heading", { level: 2 })}
            title="Heading 2"
          >
            <Heading2 size={16} />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            isActive={editor.isActive("heading", { level: 3 })}
            title="Heading 3"
          >
            <Heading3 size={16} />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().setParagraph().run()}
            isActive={editor.isActive("paragraph")}
            title="Paragraph"
          >
            <Pilcrow size={16} />
          </ToolbarButton>

          <div className="w-px h-6 bg-gray-200 mx-1" />

          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            isActive={editor.isActive("bulletList")}
            title="Bullet List"
          >
            <List size={16} />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            isActive={editor.isActive("orderedList")}
            title="Ordered List"
          >
            <ListOrdered size={16} />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            isActive={editor.isActive("blockquote")}
            title="Blockquote"
          >
            <Quote size={16} />
          </ToolbarButton>

          <div className="w-px h-6 bg-gray-200 mx-1" />

          <ToolbarButton
            onClick={setLink}
            isActive={editor.isActive("link")}
            title="Set Link"
          >
            <LinkIcon size={16} />
          </ToolbarButton>
          <ToolbarButton onClick={addImage} isActive={false} title="Add Image">
            <ImageIcon size={16} />
          </ToolbarButton>

          <div className="w-px h-6 bg-gray-200 mx-1" />

          <ToolbarButton
            onClick={() => editor.chain().focus().undo().run()}
            isActive={false}
            title="Undo"
          >
            <Undo size={16} />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().redo().run()}
            isActive={false}
            title="Redo"
          >
            <Redo size={16} />
          </ToolbarButton>
        </>
      )}

      <div className="flex-grow" />

      <ToolbarButton
        onClick={toggleViewMode}
        isActive={viewMode === "html"}
        title={viewMode === "wysiwyg" ? "View HTML" : "View Visual Editor"}
      >
        <CodeXml size={16} />
      </ToolbarButton>
    </div>
  );
}
