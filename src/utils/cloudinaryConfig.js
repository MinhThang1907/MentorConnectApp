import Config from 'react-native-config';

// Cloudinary configuration
export const CLOUDINARY_CONFIG = {
  cloudName: Config.cloudName,
  uploadPreset: Config.uploadPreset,
  apiKey: Config.apiKey,
  apiSecret: Config.apiSecret,
};

// Upload image to Cloudinary
export const uploadImageToCloudinary = async (
  imageUri,
  folder = 'profile_images',
) => {
  try {
    const formData = new FormData();

    // Prepare image data
    formData.append('file', {
      uri: imageUri,
      type: 'image/jpeg',
      name: `image_${Date.now()}.jpg`,
    });

    formData.append('upload_preset', CLOUDINARY_CONFIG.uploadPreset);
    formData.append('folder', folder);
    formData.append('cloud_name', CLOUDINARY_CONFIG.cloudName);

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CONFIG.cloudName}/image/upload`,
      {
        method: 'POST',
        body: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      },
    );

    console.log('Cloudinary response:', response);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    if (data.error) {
      throw new Error(data.error.message);
    }

    return {
      success: true,
      url: data.secure_url,
      publicId: data.public_id,
      width: data.width,
      height: data.height,
      format: data.format,
      bytes: data.bytes,
    };
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    return {
      success: false,
      error: error.message,
    };
  }
};

// Get optimized image URL with transformations
export const getOptimizedImageUrl = (publicId, transformations = {}) => {
  const {
    width = 400,
    height = 400,
    crop = 'fill',
    gravity = 'face',
    quality = 'auto',
    format = 'auto',
  } = transformations;

  return `https://res.cloudinary.com/${CLOUDINARY_CONFIG.cloudName}/image/upload/w_${width},h_${height},c_${crop},g_${gravity},q_${quality},f_${format}/${publicId}`;
};
