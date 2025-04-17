import crypto from 'crypto';
import querystring from 'querystring';
import dotenv from 'dotenv';

dotenv.config();

export const vnpayConfig = {
  tmnCode: process.env.VNPAY_TERMINAL_ID || '',
  secretKey: process.env.VNPAY_SECRET_KEY || '',
  vnpUrl: process.env.VNPAY_URL || '',
  returnUrl: process.env.VNPAY_RETURN_URL || '',
  version: '2.1.0',
  command: 'pay',
  currCode: 'VND',
  locale: 'vn'
};

// Hàm tạo chữ ký cho VNPay
export const createVnpaySignature = (data: Record<string, string>) => {
  // Sắp xếp các trường theo thứ tự a-z
  const sortedParams = Object.keys(data)
    .sort()
    .reduce((acc: Record<string, string>, key) => {
      if (data[key] !== undefined && data[key] !== null && data[key] !== '') {
        acc[key] = data[key];
      }
      return acc;
    }, {});

  // Tạo chuỗi query từ các tham số đã sắp xếp
  const signData = querystring.stringify(sortedParams, undefined, undefined, {
    encodeURIComponent: (str: string) => {
      return encodeURIComponent(str).replace(/%20/g, '+');
    }
  });
  
  const hmac = crypto.createHmac('sha512', vnpayConfig.secretKey);
  return hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');
};

// Hàm xác thực chữ ký từ callback
export const verifyVnpaySignature = (data: Record<string, string>, secureHash: string) => {
  // Loại bỏ trường vnp_SecureHash trước khi tạo lại chữ ký
  const { vnp_SecureHash, ...dataWithoutHash } = data;
  
  const calculatedHash = createVnpaySignature(dataWithoutHash);
  return calculatedHash === secureHash;
};

export default vnpayConfig; 