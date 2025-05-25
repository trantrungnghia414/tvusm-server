import { Event } from '../entities/event.entity';

export interface EventWithExtras extends Omit<Event, 'organizer_name'> {
  venue_name: string | null;
  court_name: string | null;
  organizer_name: string | null;
}
