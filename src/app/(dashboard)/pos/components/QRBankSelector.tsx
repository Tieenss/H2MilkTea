'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

// Interface cho Bank từ VietQR API
interface Bank {
  id: number;
  name: string;
  code: string;
  bin: string;
  shortName: string;
  logo: string;
  transferSupported: number;
  lookupSupported: number;
}

interface QRBankSelectorProps {
  selectedBank: Bank | null;
  accountNumber: string;
  accountName: string;
  onBankChange: (bank: Bank | null) => void;
  onAccountNumberChange: (accountNumber: string) => void;
  onAccountNameChange: (accountName: string) => void;
}

export const QRBankSelector: React.FC<QRBankSelectorProps> = ({
  selectedBank,
  accountNumber,
  accountName,
  onBankChange,
  onAccountNumberChange,
  onAccountNameChange
}) => {
  const [banks, setBanks] = useState<Bank[]>([]);
  const [isLoadingBanks, setIsLoadingBanks] = useState(false);
  const [showBankList, setShowBankList] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  // Load saved bank info từ localStorage khi component mount
  useEffect(() => {
    const savedBankInfo = localStorage.getItem('savedBankInfo');
    if (savedBankInfo) {
      try {
        const { bank, accountNumber: savedAccountNumber, accountName: savedAccountName } = JSON.parse(savedBankInfo);
        onBankChange(bank);
        onAccountNumberChange(savedAccountNumber);
        onAccountNameChange(savedAccountName);
      } catch (error) {
        console.error('Lỗi khi load thông tin ngân hàng đã lưu:', error);
      }
    }
  }, [onBankChange, onAccountNumberChange, onAccountNameChange]);

  // Fetch danh sách ngân hàng từ VietQR API
  useEffect(() => {
    const fetchBanks = async () => {
      setIsLoadingBanks(true);
      try {
        const response = await fetch('https://api.vietqr.io/v2/banks');
        const result = await response.json();
        
        if (result.code === "00" && result.data) {
          setBanks(result.data);
        }
      } catch (error) {
        console.error('Lỗi khi tải danh sách ngân hàng:', error);
        // Fallback với một số ngân hàng phổ biến
        setBanks([
          { id: 1, name: "Ngân hàng TMCP Á Châu", code: "ACB", bin: "970416", shortName: "ACB", logo: "https://api.vietqr.io/img/ACB.png", transferSupported: 1, lookupSupported: 1 },
          { id: 2, name: "Ngân hàng BIDV", code: "BIDV", bin: "970418", shortName: "BIDV", logo: "https://api.vietqr.io/img/BIDV.png", transferSupported: 1, lookupSupported: 1 },
          { id: 3, name: "Ngân hàng TMCP Quân đội", code: "MB", bin: "970422", shortName: "MBBank", logo: "https://api.vietqr.io/img/MB.png", transferSupported: 1, lookupSupported: 1 },
          { id: 4, name: "Ngân hàng TMCP Kỹ thương Việt Nam", code: "TCB", bin: "970407", shortName: "Techcombank", logo: "https://api.vietqr.io/img/TCB.png", transferSupported: 1, lookupSupported: 1 },
          { id: 5, name: "Ngân hàng TMCP Ngoại thương Việt Nam", code: "VCB", bin: "970436", shortName: "Vietcombank", logo: "https://api.vietqr.io/img/VCB.png", transferSupported: 1, lookupSupported: 1 }
        ]);
      } finally {
        setIsLoadingBanks(false);
      }
    };

    fetchBanks();
  }, []);

  // Hàm lưu thông tin tài khoản
  const handleSaveBankInfo = async () => {
    if (!selectedBank || !accountNumber.trim() || !accountName.trim()) {
      alert('Vui lòng điền đầy đủ thông tin ngân hàng!');
      return;
    }

    setIsSaving(true);
    try {
      const bankInfo = {
        bank: selectedBank,
        accountNumber: accountNumber.trim(),
        accountName: accountName.trim(),
        savedAt: new Date().toISOString()
      };

      localStorage.setItem('savedBankInfo', JSON.stringify(bankInfo));
      alert('Đã lưu thông tin tài khoản thành công!');
      setIsPopoverOpen(false); // Đóng popover sau khi lưu
    } catch (error) {
      console.error('Lỗi khi lưu thông tin:', error);
      alert('Có lỗi xảy ra khi lưu thông tin!');
    } finally {
      setIsSaving(false);
    }
  };

  // Lọc ngân hàng theo từ khóa tìm kiếm
  const filteredBanks = banks.filter(bank => 
    bank.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    bank.shortName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    bank.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* Header với nút cấu hình */}
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium text-gray-700">
          Thông tin chuyển khoản
        </Label>
        <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-xs px-3 py-1"
            >
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Cấu hình
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-96 p-4">
            <div className="space-y-4">
              <div>
                <h4 className="font-medium text-gray-800 mb-3 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.031 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  Cấu hình tài khoản ngân hàng
                </h4>
              </div>

              {/* Chọn ngân hàng */}
              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2 block">
                  Chọn ngân hàng
                </Label>
                <div className="relative">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowBankList(!showBankList)}
                    className="w-full justify-between"
                    disabled={isLoadingBanks}
                  >
                    {isLoadingBanks ? (
                      <span>Đang tải...</span>
                    ) : selectedBank ? (
                      <div className="flex items-center gap-2">
                        <img 
                          src={selectedBank.logo} 
                          alt={selectedBank.shortName}
                          className="w-5 h-5 object-contain"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                        <span>{selectedBank.shortName}</span>
                      </div>
                    ) : (
                      <span>Chọn ngân hàng</span>
                    )}
                    <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </Button>

                  {showBankList && (
                    <div className="absolute top-full left-0 right-0 z-20 mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-hidden">
                      {/* Tìm kiếm */}
                      <div className="p-2 border-b">
                        <Input
                          type="text"
                          placeholder="Tìm kiếm ngân hàng..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="w-full text-sm"
                        />
                      </div>
                      
                      {/* Danh sách ngân hàng */}
                      <div className="max-h-40 overflow-y-auto">
                        {filteredBanks.map((bank) => (
                          <button
                            key={bank.id}
                            type="button"
                            onClick={() => {
                              onBankChange(bank);
                              setShowBankList(false);
                              setSearchTerm('');
                            }}
                            className="w-full flex items-center gap-2 p-2 hover:bg-gray-100 text-left"
                          >
                            <img 
                              src={bank.logo} 
                              alt={bank.shortName}
                              className="w-5 h-5 object-contain"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                            <div>
                              <div className="font-medium text-xs">{bank.shortName}</div>
                              <div className="text-xs text-gray-500 truncate max-w-48">{bank.name}</div>
                            </div>
                          </button>
                        ))}
                        
                        {filteredBanks.length === 0 && (
                          <div className="p-4 text-center text-gray-500 text-sm">
                            Không tìm thấy ngân hàng
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Số tài khoản */}
              <div>
                <Label htmlFor="accountNumber" className="text-sm font-medium text-gray-700">
                  Số tài khoản
                </Label>
                <Input
                  id="accountNumber"
                  type="text"
                  value={accountNumber}
                  onChange={(e) => onAccountNumberChange(e.target.value)}
                  placeholder="Nhập số tài khoản"
                  className="mt-1"
                />
              </div>

              {/* Tên tài khoản */}
              <div>
                <Label htmlFor="accountName" className="text-sm font-medium text-gray-700">
                  Tên chủ tài khoản
                </Label>
                <Input
                  id="accountName"
                  type="text"
                  value={accountName}
                  onChange={(e) => onAccountNameChange(e.target.value)}
                  placeholder="Nhập tên chủ tài khoản"
                  className="mt-1"
                />
              </div>

              {/* Nút lưu */}
              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  onClick={() => setIsPopoverOpen(false)}
                  variant="outline"
                  size="sm"
                  className="flex-1"
                >
                  Hủy
                </Button>
                <Button
                  type="button"
                  onClick={handleSaveBankInfo}
                  disabled={isSaving || !selectedBank || !accountNumber.trim() || !accountName.trim()}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                  size="sm"
                >
                  {isSaving ? (
                    <>
                      <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-1"></div>
                      Lưu...
                    </>
                  ) : (
                    <>
                      <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                      </svg>
                      Lưu
                    </>
                  )}
                </Button>
              </div>
              
              <p className="text-xs text-gray-500 text-center">
                Thông tin sẽ được lưu để sử dụng cho lần thanh toán tiếp theo
              </p>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Hiển thị thông tin đã cấu hình */}
      {selectedBank && accountNumber && accountName && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="text-sm font-medium text-green-800">Đã cấu hình</span>
          </div>
          <div className="space-y-1 text-xs text-green-700">
            <div className="flex items-center gap-2">
              <img 
                src={selectedBank.logo} 
                alt={selectedBank.shortName}
                className="w-4 h-4 object-contain"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
              <span className="font-medium">{selectedBank.shortName}</span>
            </div>
            <div>STK: {accountNumber}</div>
            <div>Tên TK: {accountName}</div>
          </div>
        </div>
      )}

      {/* Thông báo chưa cấu hình */}
      {(!selectedBank || !accountNumber || !accountName) && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <span className="text-sm font-medium text-amber-800">Chưa cấu hình</span>
          </div>
          <p className="text-xs text-amber-700">
            Vui lòng ấn "Cấu hình" để thiết lập thông tin tài khoản ngân hàng
          </p>
        </div>
      )}
    </div>
  );
};

// Export interface để sử dụng ở component khác
export type { Bank };