'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { NOTE_TEMPLATES } from '../utils/constants';
import type { CartItem } from '../types/pos';

interface NoteModalProps {
  item: CartItem;
  note: string;
  onNoteChange: (note: string) => void;
  onSave: (note: string) => void;
  onClose: () => void;
}

export const NoteModal: React.FC<NoteModalProps> = ({
  item,
  note,
  onNoteChange,
  onSave,
  onClose
}) => {
  const [localNote, setLocalNote] = useState(note);

  const handleTemplateClick = (category: string, value: string) => {
    // Remove existing value of this category
    const noteItems = localNote.split('|').map(item => item.trim()).filter(Boolean);
    const filteredItems = noteItems.filter(item => !item.startsWith(`${category}:`));
    
    // Add new value
    const newItems = [...filteredItems, `${category}: ${value}`];
    const newNote = newItems.join(' | ');
    
    setLocalNote(newNote);
    onNoteChange(newNote);
  };

  const isSelected = (category: string, value: string) => {
    return localNote.includes(`${category}: ${value}`);
  };

  const handleCustomNoteChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newNote = e.target.value;
    setLocalNote(newNote);
    onNoteChange(newNote);
  };

 const handleSave = () => {
    onSave(localNote);
    onClose();
  };

  const clearNote = () => {
    setLocalNote('');
    onNoteChange('');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-bold text-gray-800">Thêm ghi chú</h2>
            <p className="text-gray-600 mt-1">
              {item.name}
            </p>
          </div>
          <Button
            onClick={onClose}
            variant="ghost"
            size="sm"
            className="text-gray-500 hover:text-gray-700"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </Button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-160px)]">
          <div className="space-y-6">
            {/* Size Options */}
            <div>
              <Label className="text-sm font-medium text-gray-700 mb-3 block">
                Kích cỡ
              </Label>
              <div className="flex flex-wrap gap-2">
                {NOTE_TEMPLATES.sizes.map(size => (
                  <Button
                    key={size}
                    type="button"
                    variant={isSelected('Size', size) ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleTemplateClick('Size', size)}
                    className={`${
                      isSelected('Size', size) 
                        ? 'bg-blue-500 text-white border-blue-500' 
                        : 'hover:bg-gray-100'
                    }`}
                  >
                    {size}
                  </Button>
                ))}
              </div>
            </div>

            {/* Sugar Options */}
            <div>
              <Label className="text-sm font-medium text-gray-700 mb-3 block">
                Lượng đường
              </Label>
              <div className="flex flex-wrap gap-2">
                {NOTE_TEMPLATES.sugar.map(sugar => (
                  <Button
                    key={sugar}
                    type="button"
                    variant={isSelected('Đường', sugar) ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleTemplateClick('Đường', sugar)}
                    className={`${
                      isSelected('Đường', sugar) 
                        ? 'bg-blue-500 text-white border-blue-500' 
                        : 'hover:bg-gray-100'
                    }`}
                  >
                    {sugar}
                  </Button>
                ))}
              </div>
            </div>

            {/* Ice Options */}
            <div>
              <Label className="text-sm font-medium text-gray-700 mb-3 block">
                Lượng đá
              </Label>
              <div className="flex flex-wrap gap-2">
                {NOTE_TEMPLATES.ice.map(ice => (
                  <Button
                    key={ice}
                    type="button"
                    variant={isSelected('Đá', ice) ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleTemplateClick('Đá', ice)}
                    className={`${
                      isSelected('Đá', ice) 
                        ? 'bg-blue-500 text-white border-blue-500' 
                        : 'hover:bg-gray-100'
                    }`}
                  >
                    {ice}
                  </Button>
                ))}
              </div>
            </div>

            {/* Temperature Options */}
            <div>
              <Label className="text-sm font-medium text-gray-700 mb-3 block">
                Nhiệt độ
              </Label>
              <div className="flex flex-wrap gap-2">
                {NOTE_TEMPLATES.temperature.map(temp => (
                  <Button
                    key={temp}
                    type="button"
                    variant={isSelected('Nhiệt độ', temp) ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleTemplateClick('Nhiệt độ', temp)}
                    className={`${
                      isSelected('Nhiệt độ', temp) 
                        ? 'bg-blue-500 text-white border-blue-500' 
                        : 'hover:bg-gray-100'
                    }`}
                  >
                    {temp}
                  </Button>
                ))}
              </div>
            </div>

            {/* Custom Note */}
            <div>
              <div className="flex justify-between items-center mb-3">
                <Label className="text-sm font-medium text-gray-700">
                  Ghi chú tùy chỉnh
                </Label>
                {localNote && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={clearNote}
                    className="text-red-600 hover:text-red-700 text-xs"
                  >
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Xóa tất cả
                  </Button>
                )}
              </div>
              <Textarea
                value={localNote}
                onChange={handleCustomNoteChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 resize-none"
                rows={4}
                placeholder="Nhập ghi chú tùy chỉnh hoặc chọn từ các tùy chọn bên trên..."
              />
              <p className="text-xs text-gray-500 mt-2">
                Các tùy chọn sẽ được tự động thêm vào ghi chú. Bạn có thể chỉnh sửa trực tiếp ở đây.
              </p>
            </div>

          
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50">
          <Button
            type="button"
            onClick={onClose}
            variant="outline"
          >
            Hủy
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
                d="M5 13l4 4L19 7" />
            </svg>
            Lưu ghi chú
          </Button>
        </div>
      </div>
    </div>
  );
};