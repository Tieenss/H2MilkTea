export const formatDate = (dateString: string): string => {
  if (!dateString) return 'Chưa cập nhật';
  
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN');
  } catch {
    return 'Không hợp lệ';
  }
};

export const formatPhoneNumber = (phone: string): string => {
  if (!phone) return 'Chưa cập nhật';
  
  // Định dạng số điện thoại Việt Nam
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10) {
    return cleaned.replace(/(\d{3})(\d{3})(\d{4})/, '$1 $2 $3');
  }
  return phone;
};