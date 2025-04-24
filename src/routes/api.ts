import express, { Request, Response } from 'express';
import { requireAuth } from '../middleware/auth.js';
import graphService from '../services/graph-service.js';

const router = express.Router();

// Get user profile from Microsoft Graph API
router.get('/me', requireAuth, async (req: Request, res: Response) => {
  try {
    if (!req.session?.user?.sub) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const profile = await graphService.getUserProfile(req.session.user.sub);
    res.json(profile);
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ error: 'Failed to fetch user profile' });
  }
});

// Get user photo from Microsoft Graph API
router.get('/me/photo', requireAuth, async (req: Request, res: Response) => {
  try {
    if (!req.session?.user?.sub) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const photo = await graphService.getUserPhoto(req.session.user.sub);
    if (!photo) {
      return res.status(404).json({ error: 'User photo not found' });
    }
    
    res.json({ photo });
  } catch (error) {
    console.error('Error fetching user photo:', error);
    res.status(500).json({ error: 'Failed to fetch user photo' });
  }
});

// Get user calendar events from Microsoft Graph API
router.get('/me/calendar', requireAuth, async (req: Request, res: Response) => {
  try {
    if (!req.session?.user?.sub) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const { startDateTime, endDateTime, top } = req.query;
    
    const events = await graphService.getUserCalendarEvents(
      req.session.user.sub,
      {
        startDateTime: startDateTime as string,
        endDateTime: endDateTime as string,
        top: top ? parseInt(top as string) : undefined
      }
    );
    
    res.json({ events });
  } catch (error) {
    console.error('Error fetching calendar events:', error);
    res.status(500).json({ error: 'Failed to fetch calendar events' });
  }
});

export default router;