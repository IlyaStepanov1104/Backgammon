'use client';

import { useState, useRef, useEffect } from 'react';

/**
 * Компонент текстового редактора с форматированием
 * @param {string} value - Текущее значение
 * @param {Function} onChange - Callback при изменении
 * @param {string} placeholder - Плейсхолдер
 * @param {number} rows - Количество строк
 */
export default function RichTextEditor({ value = '', onChange, placeholder = '', rows = 5 }) {
  const editorRef = useRef(null);
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (editorRef.current && value !== editorRef.current.innerHTML) {
      // Сохраняем позицию курсора
      const selection = window.getSelection();
      const range = selection.rangeCount > 0 ? selection.getRangeAt(0) : null;
      const cursorPosition = range ? range.startOffset : 0;
      
      // Обновляем содержимое
      editorRef.current.innerHTML = value || '';
      
      // Восстанавливаем позицию курсора, если возможно
      if (range && editorRef.current.firstChild) {
        try {
          const newRange = document.createRange();
          newRange.setStart(editorRef.current.firstChild, Math.min(cursorPosition, editorRef.current.firstChild.textContent?.length || 0));
          newRange.collapse(true);
          selection.removeAllRanges();
          selection.addRange(newRange);
        } catch (e) {
          // Игнорируем ошибки восстановления позиции
        }
      }
    }
  }, [value]);

  const handleInput = () => {
    if (editorRef.current && onChange) {
      onChange(editorRef.current.innerHTML);
    }
  };

  const execCommand = (command, value = null) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
    handleInput();
  };

  const getSelection = () => {
    return window.getSelection();
  };

  const hasSelection = () => {
    const selection = getSelection();
    return selection && selection.toString().length > 0;
  };

  const handleFormat = (command, value = null) => {
    if (!editorRef.current) return;
    
    // Убеждаемся, что редактор в фокусе
    editorRef.current.focus();
    
    // Если нет выделения, пытаемся выделить весь текст
    if (!hasSelection()) {
      try {
        const range = document.createRange();
        range.selectNodeContents(editorRef.current);
        const selection = getSelection();
        if (selection) {
          selection.removeAllRanges();
          selection.addRange(range);
        }
      } catch (e) {
        console.error('Error selecting text:', e);
      }
    }
    
    execCommand(command, value);
  };

  const handleColorChange = (e) => {
    const color = e.target.value;
    handleFormat('foreColor', color);
  };

  const handleFontSizeChange = (e) => {
    const size = e.target.value;
    handleFormat('fontSize', size);
  };

  return (
    <div className="border border-gray-300 rounded-md">
      {/* Панель инструментов */}
      <div className="border-b border-gray-300 bg-gray-50 p-2 flex flex-wrap items-center gap-2">
        {/* Жирный */}
        <button
          type="button"
          onClick={() => handleFormat('bold')}
          className="px-3 py-1 bg-white border border-gray-300 rounded hover:bg-gray-100 font-bold"
          title="Жирный (Ctrl+B)"
        >
          <strong>B</strong>
        </button>

        {/* Курсив */}
        <button
          type="button"
          onClick={() => handleFormat('italic')}
          className="px-3 py-1 bg-white border border-gray-300 rounded hover:bg-gray-100 italic"
          title="Курсив (Ctrl+I)"
        >
          <em>I</em>
        </button>

        {/* Подчеркнутый */}
        <button
          type="button"
          onClick={() => handleFormat('underline')}
          className="px-3 py-1 bg-white border border-gray-300 rounded hover:bg-gray-100 underline"
          title="Подчеркнутый"
        >
          <u>U</u>
        </button>

        <div className="w-px h-6 bg-gray-300"></div>

        {/* Размер шрифта */}
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-600">Размер:</label>
          <select
            onChange={handleFontSizeChange}
            className="px-2 py-1 bg-white border border-gray-300 rounded text-sm"
            title="Размер шрифта"
            defaultValue="3"          
            >
            <option value="1">Очень маленький</option>
            <option value="2">Маленький</option>
            <option value="3">Обычный</option>
            <option value="4">Средний</option>
            <option value="5">Большой</option>
            <option value="6">Очень большой</option>
            <option value="7">Огромный</option>
          </select>
        </div>

        <div className="w-px h-6 bg-gray-300"></div>

        {/* Цвет текста */}
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-600">Цвет:</label>
          <input
            type="color"
            onChange={handleColorChange}
            defaultValue="#000000"
            className="w-8 h-8 border border-gray-300 rounded cursor-pointer"
            title="Цвет текста"
          />
        </div>

        <div className="w-px h-6 bg-gray-300"></div>

        {/* Выровнять по левому краю */}
        <button
          type="button"
          onClick={() => handleFormat('justifyLeft')}
          className="px-3 py-1 bg-white border border-gray-300 rounded hover:bg-gray-100"
          title="Выровнять по левому краю"
        >
          ⬅
        </button>

        {/* Выровнять по центру */}
        <button
          type="button"
          onClick={() => handleFormat('justifyCenter')}
          className="px-3 py-1 bg-white border border-gray-300 rounded hover:bg-gray-100"
          title="Выровнять по центру"
        >
          ⬌
        </button>

        {/* Выровнять по правому краю */}
        <button
          type="button"
          onClick={() => handleFormat('justifyRight')}
          className="px-3 py-1 bg-white border border-gray-300 rounded hover:bg-gray-100"
          title="Выровнять по правому краю"
        >
          ➡
        </button>
      </div>

      {/* Редактор */}
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        className={`whitespace-pre-wrap px-3 py-2 outline-none ${
          isFocused ? 'ring-2 ring-blue-500' : ''
        }`}
        style={{
          minHeight: `${rows * 1.5}rem`,
          wordWrap: 'break-word',
          overflowWrap: 'break-word',
        }}
        data-placeholder={placeholder}
        suppressContentEditableWarning={true}
      />
      
      <style dangerouslySetInnerHTML={{
        __html: `
          [contenteditable][data-placeholder]:empty:before {
            content: attr(data-placeholder);
            color: #9ca3af;
            pointer-events: none;
          }
          [contenteditable] p {
            margin: 0.5em 0;
          }
          [contenteditable] p:first-child {
            margin-top: 0;
          }
          [contenteditable] p:last-child {
            margin-bottom: 0;
          }
        `
      }} />

    </div>
  );
}

