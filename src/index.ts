/* eslint-disable max-len */
import { readFile } from 'fs/promises';
import { Buffer } from 'buffer';
import { fileTypeFromBuffer, fileTypeFromFile } from 'file-type';
import { decode as decodeJpeg } from 'jpeg-js';
import { PNG } from 'pngjs';
import { URL } from 'url';
import { decode as decodeWebp } from '@cwasm/webp';
import { blockHash } from './block-hash';

export type BufferObject = {
  ext?: string;
  data: Buffer;
  name?: string;
};

const processPNG = (data: Buffer, bits: number, method: boolean) => {
  const decoded = PNG.sync.read(data);
  return blockHash(decoded, bits, method ? 2 : 1);
};

const processJPG = (data: Buffer, bits: number, method: boolean) => {
  const decoded = decodeJpeg(data);
  return blockHash(decoded, bits, method ? 2 : 1);
};

const processWebp = (data: Buffer, bits: number, method: boolean) => {
  const decoded = decodeWebp(data);
  return blockHash(decoded, bits, method ? 2 : 1);
};

const isBufferObject = (obj: string | Buffer | BufferObject): obj is BufferObject => {
  const casted = (obj as BufferObject);
  // eslint-disable-next-line max-len
  return Buffer.isBuffer(casted.data) || (Buffer.isBuffer(casted.data) && (casted.ext && casted.ext.length > 0));
};

const getFileType = async (src: string | Buffer | BufferObject, data: Buffer | string) => {
  if (typeof src !== 'string' && isBufferObject(src) && src.ext) return { mime: src.ext };
  if (Buffer.isBuffer(data)) return fileTypeFromBuffer(data);
  if (typeof src === 'string') return fileTypeFromFile(src);
  return '';
};

// eslint-disable-next-line max-len
const processImage = async (src: string | Buffer | BufferObject, bits: number, method: boolean, name: string, data: Buffer) => {
  // what is the image type
  const type = await getFileType(src, data);
  if (!type) throw new Error('Mime type not found');

  if (name && name.lastIndexOf('.') > 0) {
    const extension = name
      .split('.')
      .pop()
      .toLowerCase();

    if (extension === 'png' && type.mime === 'image/png') return processPNG(data, bits, method);
    if ((extension === 'jpg' || extension === 'jpeg') && type.mime === 'image/jpeg') return processJPG(data, bits, method);
    if (extension === 'webp' && type.mime === 'image/webp') return processWebp(data, bits, method);
    throw new Error(`Unrecognized file extension, mime type or mismatch, ext: ${extension} / mime: ${type.mime}`);
  } else {
    // eslint-disable-next-line no-console
    if (process.env.verbose) console.warn('No file extension found, attempting mime typing.');
    if (type.mime === 'image/png') return processPNG(data, bits, method);
    if (type.mime === 'image/jpeg') return processJPG(data, bits, method);
    if (type.mime === 'image/webp') return processWebp(data, bits, method);
    throw new Error(`Unrecognized mime type: ${type.mime}`);
  }
};

/**
 * Calculates a hash value for an image from various sources.
 *
 * This function takes an image source, the number of bits for the hash,
 * and a method flag to generate a hash for the given image. It supports
 * different types of image sources, including URLs, image buffers, and files.
 *
 * @param src - The image source. It can be a URL, an image buffer, or a file path.
 * @param bits - The number of bits for the hash. Higher values yield more detailed hashes but may be slower to compute.
 * @param method - A boolean flag indicating whether a precision algorithm is used.
 *
 *                `true` Precise but slower, non-overlapping blocks. Only advisable when the image width and height are an even multiple of the number of blocks used.
 *
 *                `false` Quick and crude, non-overlapping blocks. A good trade-off between speed and good matches on any image size.
 * @throws {Error} Throws an error if no image source is provided.
 * @returns A Promise that resolves to the hash value of the input image.
 */
export const imageHash = async (src: string | BufferObject, bits: number, method: boolean) => {
  // check if source is assigned
  if (src === undefined) throw new Error('No image source provided');

  // url
  if (typeof src === 'string' && (src.indexOf('http') === 0 || src.indexOf('https') === 0)) {
    const url = new URL(src);
    const response = await fetch(url.href);
    return processImage(src, bits, method, url.pathname, Buffer.from(await response.arrayBuffer()));
  }

  // image buffers
  if (typeof src !== 'string' && isBufferObject(src)) return processImage(src, bits, method, src.name, src.data);

  // file
  const fileBuffer = await readFile(src);
  return processImage(src, bits, method, src, fileBuffer);
};
