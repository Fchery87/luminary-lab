/**
 * Image Processing Queue
 * 
 * This module provides the interface for the image processing job queue.
 * It now uses BullMQ (queue-v2.ts) for improved performance and features.
 * 
 * Migration: Legacy Bull-based queue has been replaced with BullMQ.
 * This file maintains backward compatibility for existing imports.
 */

export {
  getImageProcessingQueue,
  createImageProcessingWorker,
  createImageProcessingFlow,
  getFlowProducer,
  getRedis,
  imageProcessingQueue,
  type ImageProcessingJobData,
} from "./queue-v2";

// Legacy interface for backward compatibility
export interface ImageProcessingJob {
  id: string;
  projectId: string;
  styleId: string;
  intensity: number;
  originalImageKey: string;
  userId: string;
  orientation?: number;
}
