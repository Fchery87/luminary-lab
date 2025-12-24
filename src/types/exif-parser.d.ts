declare module 'exif-parser' {
  export function create(buffer: Buffer): Parser;
  
  export interface Parser {
    parse(): ParseResult;
  }
  
  export interface ParseResult {
    tags: {
      [key: string]: any;
      Make?: string;
      Model?: string;
      LensMake?: string;
      LensModel?: string;
      ImageWidth?: number;
      ImageLength?: number;
      Orientation?: number;
      XResolution?: number;
      YResolution?: number;
      DateTime?: string;
      ISOSpeedRatings?: number | number[];
      ISO?: number;
      FNumber?: number;
      FocalLength?: number | string;
      ExposureTime?: number | string;
      ShutterSpeed?: number | string;
      ExposureProgram?: number | string;
      WhiteBalance?: number | string;
      ColorSpace?: number | string;
      Flash?: number;
      GPSLatitude?: number;
      GPSLongitude?: number;
      GPSAltitude?: number;
      GPSImgDirection?: number;
      BitsPerSample?: number[];
      SamplesPerPixel?: number;
      Compression?: number;
      Software?: string;
      Artist?: string;
      Copyright?: string;
      ExifVersion?: string;
      UserComment?: string;
    };
    imageSize?: {
      width: number;
      height: number;
    };
    thumbnail?: Buffer;
  }
}
