"use client";

import React, { useRef, useEffect, useState } from 'react';
import { 
  Bold, 
  Italic, 
  Underline, 
  Strikethrough, 
  Type, 
  List, 
  ListOrdered, 
  AlignLeft, 
  AlignCenter, 
  AlignRight, 
  AlignJustify, 
  Link as LinkIcon, 
  Trash2, 
  Type as TypeIcon,
  Palette,
  Eraser
} from 'lucide-react';
import { cn } from '@/utils/cn';

/**
 * Microsoft Word-style Rich Text Editor
 * Using contentEditable and document.execCommand for native rich text capabilities
 */
export default function RichTextEditor({ value, onChange, placeholder }) {
  const editorRef = useRef(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Sync internal content with external value (only if different to avoid cursor jumps)
  useEffect(() => {
    if (editorRef.current && value !== editorRef.current.innerHTML) {
      editorRef.current.innerHTML = value || "";
    }
  }, [value]);

  const handleInput = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  const execCommand = (command, value = null) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
  };

  const handleLink = () => {
    const url = prompt("Enter URL:", "https://");
    if (url) execCommand("createLink", url);
  };

  const handleColor = (e) => {
    execCommand("foreColor", e.target.value);
  };

  const handleBgColor = (e) => {
    execCommand("hiliteColor", e.target.value);
  };

  const handleFormat = (e) => {
    execCommand("formatBlock", e.target.value);
  };

  if (!isMounted) return null;

  return (
    <div className="w-full border-2 border-zinc-100 rounded-[40px] overflow-hidden bg-white shadow-sm hover:shadow-md transition-all duration-500 focus-within:border-admin-primary/20">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1 p-4 bg-zinc-50/50 border-b border-zinc-100 select-none">
        {/* Block Format */}
        <select 
          onChange={handleFormat}
          className="px-3 py-1.5 bg-white border border-zinc-200 rounded-lg text-[11px] font-black uppercase tracking-widest outline-none focus:ring-2 ring-admin-primary/10 mr-2"
        >
          <option value="P">Normal</option>
          <option value="H1">Header 1</option>
          <option value="H2">Header 2</option>
          <option value="H3">Header 3</option>
          <option value="BLOCKQUOTE">Quote</option>
        </select>

        <div className="h-6 w-px bg-zinc-200 mx-2" />

        {/* Basic Styles */}
        <ToolbarButton onClick={() => execCommand("bold")} icon={Bold} title="Bold" />
        <ToolbarButton onClick={() => execCommand("italic")} icon={Italic} title="Italic" />
        <ToolbarButton onClick={() => execCommand("underline")} icon={Underline} title="Underline" />
        <ToolbarButton onClick={() => execCommand("strikeThrough")} icon={Strikethrough} title="Strikethrough" />

        <div className="h-6 w-px bg-zinc-200 mx-2" />

        {/* Colors */}
        <div className="relative group p-1">
          <label className="cursor-pointer hover:bg-zinc-200 p-1.5 rounded-lg transition-colors flex items-center">
            <Palette size={18} className="text-zinc-600" />
            <input type="color" className="absolute opacity-0 w-0 h-0" onChange={handleColor} />
          </label>
        </div>
        <div className="relative group p-1">
          <label className="cursor-pointer hover:bg-zinc-200 p-1.5 rounded-lg transition-colors flex items-center">
            <TypeIcon size={18} className="text-zinc-600 bg-yellow-200" />
            <input type="color" className="absolute opacity-0 w-0 h-0" onChange={handleBgColor} />
          </label>
        </div>

        <div className="h-6 w-px bg-zinc-200 mx-2" />

        {/* Lists */}
        <ToolbarButton onClick={() => execCommand("insertUnorderedList")} icon={List} title="Bullet List" />
        <ToolbarButton onClick={() => execCommand("insertOrderedList")} icon={ListOrdered} title="Numbered List" />

        <div className="h-6 w-px bg-zinc-200 mx-2" />

        {/* Alignment */}
        <ToolbarButton onClick={() => execCommand("justifyLeft")} icon={AlignLeft} title="Align Left" />
        <ToolbarButton onClick={() => execCommand("justifyCenter")} icon={AlignCenter} title="Align Center" />
        <ToolbarButton onClick={() => execCommand("justifyRight")} icon={AlignRight} title="Align Right" />
        <ToolbarButton onClick={() => execCommand("justifyFull")} icon={AlignJustify} title="Justify" />

        <div className="h-6 w-px bg-zinc-200 mx-2" />

        {/* Actions */}
        <ToolbarButton onClick={handleLink} icon={LinkIcon} title="Insert Link" />
        <ToolbarButton onClick={() => execCommand("removeFormat")} icon={Eraser} title="Clear Formatting" />
      </div>

      {/* Editable Area */}
      <div className="relative">
        <div
          ref={editorRef}
          contentEditable
          onInput={handleInput}
          className="w-full min-h-[500px] p-12 outline-none text-zinc-700 font-medium leading-relaxed text-lg prose prose-zinc max-w-none"
          style={{ whiteSpace: 'pre-wrap' }}
        />
        {!value && (
          <div className="absolute top-12 left-12 text-zinc-300 pointer-events-none font-bold text-lg">
            {placeholder || "Start typing your content..."}
          </div>
        )}
      </div>
    </div>
  );
}

function ToolbarButton({ onClick, icon: Icon, title }) {
  return (
    <button
      onClick={(e) => {
        e.preventDefault();
        onClick();
      }}
      title={title}
      className="p-2 rounded-lg hover:bg-zinc-200 text-zinc-600 transition-colors"
    >
      <Icon size={18} />
    </button>
  );
}
