/* eslint-disable @typescript-eslint/no-misused-promises */
import { Router } from 'express';
import {
  createReview,
  getReviewsByBook,
  getReviewsByUser,
  deleteReview,
} from '@/modules/reviews/review.controller';

const router = Router();

router.post('/', createReview);
router.get('/book/:bookId', getReviewsByBook);
router.get('/user/:userId', getReviewsByUser);
router.delete('/:id', deleteReview);

export default router;
