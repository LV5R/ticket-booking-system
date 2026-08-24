import QRCode from 'qrcode';

// Returns a base64 PNG data URL — embed directly in HTML email or <img src="...">
export const generateQR = async (bookingRef) => {
  try {
    const dataUrl = await QRCode.toDataURL(bookingRef, {
      errorCorrectionLevel: 'H',
      width: 300,
      margin: 2,
    });
    return dataUrl;
  } catch (err) {
    console.error('[qr.service] Failed to generate QR:', err.message);
    return null;
  }
};
