/**
 * Microsoft Graph API Service
 * Handles Microsoft Graph API requests
 */
import axios from 'axios';
import authService from './auth-service.js';

class GraphService {
  private static instance: GraphService;
  private graphApiBaseUrl = 'https://graph.microsoft.com/v1.0';
  
  private constructor() {}
  
  /**
   * Get singleton instance
   */
  public static getInstance(): GraphService {
    if (!GraphService.instance) {
      GraphService.instance = new GraphService();
    }
    return GraphService.instance;
  }
  
  /**
   * Get user profile information from Microsoft Graph API
   */
  public async getUserProfile(userId: string): Promise<any> {
    try {
      const userToken = authService.getUserToken(userId);
      
      if (!userToken || authService.isTokenExpired(userToken)) {
        throw new Error('Token is missing or expired');
      }
      
      const response = await axios.get(`${this.graphApiBaseUrl}/me`, {
        headers: {
          Authorization: `Bearer ${userToken.access_token}`
        }
      });
      
      return response.data;
    } catch (error) {
      console.error('Error fetching user profile from Graph API:', error);
      throw error;
    }
  }
  
  /**
   * Get user photo from Microsoft Graph API
   */
  public async getUserPhoto(userId: string): Promise<string | null> {
    try {
      const userToken = authService.getUserToken(userId);
      
      if (!userToken || authService.isTokenExpired(userToken)) {
        throw new Error('Token is missing or expired');
      }
      
      const response = await axios.get(`${this.graphApiBaseUrl}/me/photo/$value`, {
        headers: {
          Authorization: `Bearer ${userToken.access_token}`
        },
        responseType: 'arraybuffer'
      });
      
      const base64Image = Buffer.from(response.data, 'binary').toString('base64');
      return `data:image/jpeg;base64,${base64Image}`;
    } catch (error) {
      console.error('Error fetching user photo from Graph API:', error);
      return null;
    }
  }
  
  /**
   * Get user's calendar events from Microsoft Graph API
   */
  public async getUserCalendarEvents(userId: string, options: {
    startDateTime?: string;
    endDateTime?: string;
    top?: number;
  } = {}): Promise<any[]> {
    try {
      const userToken = authService.getUserToken(userId);
      
      if (!userToken || authService.isTokenExpired(userToken)) {
        throw new Error('Token is missing or expired');
      }
      
      const { startDateTime, endDateTime, top = 10 } = options;
      let url = `${this.graphApiBaseUrl}/me/calendar/events?$top=${top}`;
      
      if (startDateTime && endDateTime) {
        url += `&$filter=start/dateTime ge '${startDateTime}' and end/dateTime le '${endDateTime}'`;
      }
      
      const response = await axios.get(url, {
        headers: {
          Authorization: `Bearer ${userToken.access_token}`
        }
      });
      
      return response.data.value || [];
    } catch (error) {
      console.error('Error fetching user calendar events from Graph API:', error);
      return [];
    }
  }
}

export default GraphService.getInstance();