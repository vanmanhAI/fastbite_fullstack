import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

export const momoConfig = {
  partnerCode: process.env.MOMO_PARTNER_CODE || '',
  accessKey: process.env.MOMO_ACCESS_KEY || '',
  secretKey: process.env.MOMO_SECRET_KEY || '',
  endpoint: process.env.MOMO_ENDPOINT || '',
  returnUrl: `${process.env.FRONTEND_URL}/payment/success?method=momo`,
  notifyUrl: `${process.env.FRONTEND_URL}/api/momo-ipn`,
  requestType: 'captureWallet'
};

// Hàm tạo chữ ký cho MoMo
export const createMomoSignature = (data: any) => {
  const rawSignature = Object.keys(data)
    .filter(key => data[key] !== undefined && data[key] !== null && key !== 'signature')
    .sort()
    .map(key => `${key}=${data[key]}`)
    .join('&');

  return crypto
    .createHmac('sha256', momoConfig.secretKey)
    .update(rawSignature)
    .digest('hex');
};

// Hàm xác thực chữ ký từ IPN callback
export const verifyMomoSignature = (data: any, receivedSignature: string) => {
  const signature = createMomoSignature(data);
  return signature === receivedSignature;
};

export default momoConfig; 