# Comprehensive Spond API Integration Guide - Extended Edition

## ⚠️ Critical Disclaimer

This is an **unofficial, reverse-engineered API**. **Spond explicitly does not provide public API documentation** and has stated: "We do not currently offer an open API for Spond, so the ability to export posts to external websites is not available." This integration may break without notice if Spond changes their API. All usage is **unsupported and at your own risk**.

## Executive Summary

After extensive research, the Spond API ecosystem consists of:

- **No official API or documentation** - Spond has explicitly stated no public API exists
- **Robust community reverse-engineering efforts** - Multiple libraries and documentation projects
- **Comprehensive internal API** - Extensive functionality discovered through mobile app analysis
- **Enterprise-grade security** - SOC II/ISO 27001 compliant, but closed to public access

## Official Position vs. Reality

### Spond's Official Stance

- No public API documentation or developer portal exists
- No developer partnerships or integration programs
- Help documentation explicitly states no open API availability
- Contact support@spond.com for any integration requests (though no evidence of private API programs)

### Community Response

Despite official limitations, the developer community has created substantial reverse-engineered solutions:

- **Production-ready Python library** with 1.1.1 release on PyPI
- **Comprehensive API documentation** via Swagger at https://martcl.github.io/spond/
- **Multiple language implementations** (Python, TypeScript, class abstractions)
- **Active maintenance** with regular updates and bug fixes

## Community Libraries & Resources

### Primary Python Library: Olen/Spond

**Repository**: https://github.com/Olen/Spond  
**PyPI**: https://pypi.org/project/spond/  
**Status**: Actively maintained (v1.1.1)

```python
# Installation
pip install spond

# Basic usage
import asyncio
from spond import Spond

async def main():
    s = Spond(username='your@email.com', password='password')

    # Get all groups
    groups = await s.get_groups()

    # Get upcoming events
    events = await s.get_events(max_events=10, include_scheduled=True)

    # Send message
    await s.send_message(text='Hello team!', group_uid='group_id')

    # Export attendance as Excel
    xlsx_data = await s.get_event_attendance_xlsx(event_id='event_id')

    await s.clientsession.close()

# Key methods available:
# - get_groups()
# - get_events(max_events=100, include_scheduled=False, max_start=None, min_start=None)
# - get_event(event_id)
# - get_messages(max_messages=100)
# - send_message(text, user_uid=None, group_uid=None, chat_id=None)
# - update_event_response(event_id, user_id, response_status)
# - get_event_attendance_xlsx(event_id)
# - get_group_transactions(group_id, skip=0)
```

### TypeScript Implementation: d3ntastic/spond-api

**Repository**: https://github.com/d3ntastic/spond-api  
**Status**: Active TypeScript port of the Python library

### Class Abstraction Layer: elliot-100/Spond-classes

**Repository**: https://github.com/elliot-100/Spond-classes  
**Documentation**: https://elliot-100.github.io/Spond-classes/  
**Features**: Pydantic-based class abstraction over the Olen/Spond library

### API Documentation Project: martcl/spond

**Repository**: https://github.com/martcl/spond  
**Swagger Documentation**: https://martcl.github.io/spond/  
**Method**: Created by intercepting mobile app traffic with Burp Suite proxy

### Specialized Tools

- **jtracey93/spond-payment-reporting**: Automated payment reporting tooling
- **Community Home Assistant integrations**: Multiple unofficial integrations available

## Enhanced API Overview

### Base URLs (Confirmed)

- **Core API**: `https://api.spond.com/core/v1/`
- **Club API**: `https://api.spond.com/club/v1/`
- **Chat API**: Dynamic URL obtained from core API
- **Legal/Privacy**: `https://spond.com/api/2.1/legal/privacy`

### Potential Additional Endpoints (Unconfirmed)

Based on mobile app analysis, these endpoint patterns may exist:

- **Mobile API**: `https://api.spond.com/mobile/v1/`
- **Push Notifications**: `https://api.spond.com/push/v1/`
- **Sync API**: `https://api.spond.com/sync/v1/`
- **Statistics**: `https://api.spond.com/stats/v1/`

## Authentication & Security

### Authentication Flow

```typescript
// POST https://api.spond.com/core/v1/login
interface LoginRequest {
  email: string;
  password: string;
}

interface LoginResponse {
  loginToken: string;
  user: UserProfile;
  // Additional user data
}

// All subsequent requests
headers: {
  'Authorization': `Bearer ${loginToken}`,
  'Content-Type': 'application/json'
}
```

### Security Implementation

- **Encryption**: TLS 1.2+ for all communications
- **Compliance**: SOC II and ISO 27001 certified
- **Testing**: Annual penetration testing
- **Infrastructure**: Secure AWS hosting (Dublin & Frankfurt)
- **No OAuth/SSO**: Only username/password authentication available
- **No API Keys**: Bearer tokens only method discovered

### Rate Limiting & Quotas

- **No official documentation** on rate limits
- **Community library defaults**: 100 events, 100 messages per query
- **Recommended approach**: Implement exponential backoff for resilience

## Core API Endpoints (Enhanced)

### 1. Groups

```typescript
// GET https://api.spond.com/core/v1/groups/
// Enhanced response structure based on community findings
interface Group {
  id: string;
  name: string;
  description?: string;
  createdTime: string;
  imageUrl?: string;
  members: Member[];
  subGroups?: SubGroup[];
  roles: Role[];
  settings: GroupSettings;
  statistics?: GroupStatistics;
}

interface Member {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phoneNumber?: string;
  dateOfBirth?: string;
  profile?: {
    id: string;
    imageUrl?: string;
  };
  guardians?: Guardian[];
  roles: string[];
  subGroups: string[];
  createdTime: string;
}

interface GroupSettings {
  allowMemberInvites: boolean;
  requireAcceptance: boolean;
  visibilityLevel: 'PUBLIC' | 'PRIVATE' | 'HIDDEN';
  autoReminders: boolean;
  defaultEventSettings: EventSettings;
}
```

### 2. Events (Sponds) - Extended

```typescript
// GET https://api.spond.com/core/v1/sponds/
// Enhanced query parameters discovered
interface EventsParams {
  max?: string; // Max number of events (default: 100)
  scheduled?: string; // Include scheduled events ('true'/'false')
  groupId?: string; // Filter by group
  subGroupId?: string; // Filter by subgroup
  includeHidden?: string; // Include hidden events ('true'/'false')
  includeCancelled?: string; // Include cancelled events
  includeComments?: string; // Include event comments
  maxEndTimestamp?: string; // Format: YYYY-MM-DDT00:00:00.000Z
  minEndTimestamp?: string;
  maxStartTimestamp?: string;
  minStartTimestamp?: string;
  orderBy?: 'startTimestamp' | 'createdTime';
  orderDirection?: 'asc' | 'desc';
}

// Enhanced event structure
interface Event {
  id: string;
  heading: string;
  description?: string;
  startTimestamp: string; // ISO 8601 format in UTC (e.g., "2024-03-15T14:30:00Z")
  endTimestamp: string; // ISO 8601 format in UTC (e.g., "2024-03-15T16:30:00Z")
  allDay?: boolean;
  location?: {
    feature: string;
    address: string;
    latitude?: number;
    longitude?: number;
    indoor?: boolean;
  };
  responses?: {
    [userId: string]: {
      accepted: boolean;
      responded: boolean;
      responseTime?: string;
      comment?: string;
      declinedReason?: string;
    };
  };
  owners: Owner[];
  organizer: Organizer;
  inviteTime?: string;
  type: 'EVENT' | 'TRAINING' | 'MATCH' | 'MEETING';
  commentsDisabled?: boolean;
  responsesDisabled?: boolean;
  maxAccepted?: number;
  autoAccept?: boolean;
  cancelled?: boolean;
  recurring?: RecurringSettings;
  attachments?: Attachment[];
  customFields?: CustomField[];
  visibility: 'PUBLIC' | 'PRIVATE';
  groupId: string;
  subGroupIds: string[];
}

interface RecurringSettings {
  pattern: 'WEEKLY' | 'MONTHLY' | 'CUSTOM';
  interval: number;
  endDate?: string;
  exceptions?: string[]; // Event IDs that were modified
}
```

### 3. Enhanced Event Operations

#### Bulk Event Operations

```typescript
// POST https://api.spond.com/core/v1/sponds/bulk
interface BulkEventRequest {
  operation: 'CREATE' | 'UPDATE' | 'DELETE';
  events: Event[];
  options: {
    notifyMembers?: boolean;
    updateRecurring?: 'THIS_ONLY' | 'THIS_AND_FUTURE' | 'ALL';
  };
}
```

#### Event Templates

```typescript
// GET https://api.spond.com/core/v1/sponds/templates
// POST https://api.spond.com/core/v1/sponds/templates
interface EventTemplate {
  id: string;
  name: string;
  description?: string;
  defaultDuration: number; // minutes
  defaultLocation?: Location;
  defaultSettings: EventSettings;
  customFields: CustomField[];
}
```

#### Advanced Export Capabilities

```typescript
// GET https://api.spond.com/core/v1/sponds/{eventId}/export
// Query parameters for export customization
interface ExportParams {
  format: 'XLSX' | 'CSV' | 'PDF';
  includeComments?: boolean;
  includeResponses?: boolean;
  includeContactInfo?: boolean;
  groupBy?: 'RESPONSE' | 'SUBGROUP' | 'ROLE';
  language?: 'en' | 'no' | 'da' | 'sv' | 'de';
}
```

### 4. Enhanced Chat/Messages System

#### Advanced Chat Initialization

```typescript
// POST https://api.spond.com/core/v1/chat
interface ChatInitRequest {
  capabilities?: string[]; // ['READ', 'WRITE', 'ADMIN']
  preferredServer?: string; // Geographic preference
}

interface ChatInitResponse {
  url: string; // Dynamic chat server URL
  auth: string; // Separate auth token for chat
  capabilities: string[];
  serverRegion: string;
  expiresAt: string;
}
```

#### Message Types & Features

```typescript
// Enhanced message sending
interface MessageRequest {
  text?: string;
  type: 'TEXT' | 'IMAGE' | 'FILE' | 'POLL' | 'ANNOUNCEMENT';
  attachment?: {
    type: 'IMAGE' | 'PDF' | 'DOCUMENT';
    url: string;
    name: string;
    size: number;
  };
  poll?: {
    question: string;
    options: string[];
    allowMultiple: boolean;
    anonymous: boolean;
  };
  priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  scheduledAt?: string; // For delayed sending
  recipients?: {
    groupId?: string;
    subGroupIds?: string[];
    userIds?: string[];
    roles?: string[];
  };
}

// Message reactions and threading
// PUT {chatUrl}/messages/{messageId}/reaction
interface ReactionRequest {
  emoji: string; // Unicode emoji
  action: 'ADD' | 'REMOVE';
}

// POST {chatUrl}/messages/{messageId}/reply
interface ReplyRequest {
  text: string;
  type: 'REPLY';
  parentMessageId: string;
}
```

#### Chat Administration

```typescript
// GET {chatUrl}/chats/{chatId}/participants
// POST {chatUrl}/chats/{chatId}/participants
// DELETE {chatUrl}/chats/{chatId}/participants/{userId}

interface ChatParticipant {
  userId: string;
  role: 'MEMBER' | 'ADMIN' | 'OWNER';
  joinedAt: string;
  lastSeenAt?: string;
  notifications: 'ALL' | 'MENTIONS' | 'NONE';
}
```

## Extended Club API Endpoints

### Enhanced Transactions

```typescript
// GET https://api.spond.com/club/v1/transactions
// Enhanced query parameters
interface TransactionParams {
  skip?: number; // Pagination (25 items per page)
  status?: 'PENDING' | 'PAID' | 'CANCELLED' | 'REFUNDED';
  dateFrom?: string; // ISO date string
  dateTo?: string;
  memberId?: string;
  paymentMethod?: 'STRIPE' | 'VIPPS' | 'BANK_TRANSFER';
  includeRefunds?: boolean;
}

interface EnhancedTransaction {
  id: string;
  paidAt?: string;
  createdAt: string;
  paymentName: string;
  description?: string;
  paidByName: string;
  paidById: string;
  amount: number;
  currency: string;
  status: 'PENDING' | 'PAID' | 'CANCELLED' | 'REFUNDED';
  paymentMethod?: string;
  stripePaymentId?: string;
  invoiceUrl?: string;
  receiptUrl?: string;
  dueDate?: string;
  category?: string;
  tags?: string[];
  recurring?: RecurringPayment;
}

interface RecurringPayment {
  frequency: 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY';
  nextPaymentDate: string;
  endDate?: string;
  autoRetry: boolean;
}
```

### Payment Management

```typescript
// POST https://api.spond.com/club/v1/payments
interface CreatePaymentRequest {
  name: string;
  description?: string;
  amount: number;
  currency: string;
  dueDate?: string;
  recipients: {
    groupId?: string;
    subGroupIds?: string[];
    memberIds?: string[];
  };
  paymentMethods: string[];
  recurring?: RecurringPaymentSettings;
  reminders?: ReminderSettings;
}

// Stripe integration
// POST https://api.spond.com/club/v1/payments/{paymentId}/stripe/setup-intent
// GET https://api.spond.com/club/v1/payments/{paymentId}/stripe/status
```

### Financial Reporting

```typescript
// GET https://api.spond.com/club/v1/reports/financial
interface FinancialReportParams {
  dateFrom: string;
  dateTo: string;
  groupBy: 'MONTH' | 'QUARTER' | 'CATEGORY' | 'MEMBER';
  includeProjected?: boolean; // Include recurring payments
  currency?: string;
}

interface FinancialReport {
  summary: {
    totalIncome: number;
    totalOutstanding: number;
    averagePaymentTime: number; // days
    paymentRate: number; // percentage
  };
  breakdown: ReportItem[];
  trends: TrendData[];
}
```

## Additional Discovered Endpoints

### Member Relationship Management

```typescript
// GET https://api.spond.com/core/v1/members/{memberId}/relationships
// POST https://api.spond.com/core/v1/members/{memberId}/guardians
interface Guardian {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string;
  relationship: 'PARENT' | 'GUARDIAN' | 'EMERGENCY_CONTACT';
  primaryContact: boolean;
  permissions: Permission[];
}

interface Permission {
  type: 'VIEW_EVENTS' | 'RESPOND_EVENTS' | 'RECEIVE_MESSAGES' | 'MAKE_PAYMENTS';
  granted: boolean;
}
```

### Statistics & Analytics

```typescript
// GET https://api.spond.com/core/v1/groups/{groupId}/statistics
interface GroupStatistics {
  memberCount: number;
  activeMembers: number; // Last 30 days
  averageAttendance: number; // percentage
  eventCount: {
    total: number;
    upcoming: number;
    thisMonth: number;
  };
  engagementMetrics: {
    messagesSent: number;
    averageResponseTime: number; // hours
    participationRate: number; // percentage
  };
  trends: {
    memberGrowth: TrendPoint[];
    attendanceRate: TrendPoint[];
    activityLevel: TrendPoint[];
  };
}

// GET https://api.spond.com/core/v1/events/{eventId}/statistics
interface EventStatistics {
  invitedCount: number;
  respondedCount: number;
  acceptedCount: number;
  declinedCount: number;
  responseRate: number; // percentage
  averageResponseTime: number; // hours
  lastResponseTime: string;
  noShowCount?: number; // If attendance tracking enabled
  responsesBySubGroup: SubGroupStats[];
}
```

### Device & Notification Management

```typescript
// POST https://api.spond.com/core/v1/devices/register
interface DeviceRegistration {
  deviceId: string;
  platform: 'IOS' | 'ANDROID' | 'WEB';
  pushToken?: string;
  deviceName: string;
  appVersion: string;
  osVersion: string;
}

// GET https://api.spond.com/core/v1/users/{userId}/notifications/settings
// PUT https://api.spond.com/core/v1/users/{userId}/notifications/settings
interface NotificationSettings {
  pushNotifications: boolean;
  emailNotifications: boolean;
  smsNotifications: boolean;
  preferences: {
    newEvents: boolean;
    eventReminders: boolean;
    eventChanges: boolean;
    newMessages: boolean;
    directMessages: boolean;
    paymentRequests: boolean;
    paymentReminders: boolean;
    announcementPosts: boolean;
  };
  quietHours: {
    enabled: boolean;
    startTime: string; // HH:MM
    endTime: string; // HH:MM
  };
  groupSpecificSettings: {
    [groupId: string]: NotificationPreference;
  };
}
```

### Calendar Integration

```typescript
// GET https://api.spond.com/core/v1/users/{userId}/calendar/ical
// Returns iCal format for calendar sync

// POST https://api.spond.com/core/v1/groups/{groupId}/calendar/google-sync
interface GoogleCalendarSync {
  calendarId: string;
  syncEvents: boolean;
  syncResponses: boolean;
  twoWaySync: boolean; // Sync changes back to Spond
}

// Calendar webhook support (unconfirmed)
// POST https://api.spond.com/core/v1/webhooks/calendar
interface CalendarWebhook {
  url: string;
  events: ('EVENT_CREATED' | 'EVENT_UPDATED' | 'RESPONSE_CHANGED')[];
  secret: string; // For signature verification
}
```

## Timezone Handling

### Important Notes

- **All timestamps from Spond API are in UTC** (ISO 8601 format with 'Z' suffix)
- Activities store `startTimestamp` and `endTimestamp` in UTC
- When displaying to users, timestamps must be converted to local timezone

### HomeDash Implementation

The HomeDash backend handles timezone conversion automatically:

1. **Container Timezone**: Set via `TZ` environment variable in docker-compose.yml

   ```yaml
   environment:
     - TZ=Europe/Oslo # Change to your local timezone
   ```

2. **Database Storage**: Spond timestamps are stored as-is in UTC format

3. **Display Conversion**: When fetching activities, SQLite converts UTC to local time:

   ```sql
   SELECT
     DATE(start_timestamp, 'localtime') as date,
     TIME(start_timestamp, 'localtime') as start_time,
     TIME(end_timestamp, 'localtime') as end_time
   FROM spond_activities
   ```

4. **Result**: Activities appear at the correct local time in the UI

### Example Timezone Flow

```
Spond API returns: "2024-03-15T14:30:00Z" (UTC)
Container TZ: Europe/Oslo (UTC+1 or UTC+2 depending on DST)
Displayed time: 15:30 (in winter) or 16:30 (in summer)
```

## TypeScript Implementation Example (Enhanced)

```typescript
// Enhanced TypeScript implementation
export class EnhancedSpondAPI {
  private baseUrl = 'https://api.spond.com/core/v1/';
  private clubUrl = 'https://api.spond.com/club/v1/';
  private token: string | null = null;
  private chatUrl: string | null = null;
  private chatAuth: string | null = null;
  private rateLimiter = new RateLimiter(100, 3600000); // 100 requests per hour

  async login(email: string, password: string): Promise<LoginResponse> {
    try {
      const response = await fetch(`${this.baseUrl}login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        throw new Error(`Login failed: ${response.status}`);
      }

      const data: LoginResponse = await response.json();
      if (data.loginToken) {
        this.token = data.loginToken;
        return data;
      }
      throw new Error('No login token received');
    } catch (error) {
      console.error('Spond login error:', error);
      throw error;
    }
  }

  private async makeAuthenticatedRequest<T>(
    url: string,
    options: RequestInit = {}
  ): Promise<T> {
    if (!this.token) throw new Error('Not authenticated');

    await this.rateLimiter.waitForAvailability();

    const response = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (response.status === 401) {
      // Token expired, attempt re-authentication
      this.token = null;
      throw new Error('Authentication expired');
    }

    if (!response.ok) {
      throw new Error(`Request failed: ${response.status}`);
    }

    return response.json();
  }

  // Enhanced group methods
  async getGroups(): Promise<Group[]> {
    return this.makeAuthenticatedRequest(`${this.baseUrl}groups/`);
  }

  async getGroupStatistics(groupId: string): Promise<GroupStatistics> {
    return this.makeAuthenticatedRequest(
      `${this.baseUrl}groups/${groupId}/statistics`
    );
  }

  // Enhanced event methods
  async getEvents(params: EventsParams = {}): Promise<Event[]> {
    const queryParams = new URLSearchParams({
      max: params.max || '100',
      scheduled: params.scheduled || 'false',
      includeComments: params.includeComments || 'false',
      orderBy: params.orderBy || 'startTimestamp',
      orderDirection: params.orderDirection || 'asc',
      ...params,
    });

    return this.makeAuthenticatedRequest(
      `${this.baseUrl}sponds/?${queryParams}`
    );
  }

  async createEventFromTemplate(
    templateId: string,
    overrides: Partial<Event>
  ): Promise<Event> {
    return this.makeAuthenticatedRequest(
      `${this.baseUrl}sponds/from-template`,
      {
        method: 'POST',
        body: JSON.stringify({ templateId, overrides }),
      }
    );
  }

  async exportEventAttendance(
    eventId: string,
    params: ExportParams
  ): Promise<Blob> {
    const queryParams = new URLSearchParams(params);
    const response = await fetch(
      `${this.baseUrl}sponds/${eventId}/export?${queryParams}`,
      { headers: this.getAuthHeaders() }
    );
    return response.blob();
  }

  // Enhanced chat methods
  async initializeChat(capabilities?: string[]): Promise<ChatInitResponse> {
    const response = await this.makeAuthenticatedRequest(
      `${this.baseUrl}chat`,
      {
        method: 'POST',
        body: JSON.stringify({ capabilities }),
      }
    );
    this.chatUrl = response.url;
    this.chatAuth = response.auth;
    return response;
  }

  async sendAdvancedMessage(request: MessageRequest): Promise<any> {
    if (!this.chatUrl || !this.chatAuth) {
      await this.initializeChat();
    }

    const response = await fetch(`${this.chatUrl}/messages`, {
      method: 'POST',
      headers: { auth: this.chatAuth!, 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
    return response.json();
  }

  // Enhanced payment methods
  async getTransactions(
    clubId: string,
    params: TransactionParams = {}
  ): Promise<EnhancedTransaction[]> {
    const queryParams = new URLSearchParams({
      skip: (params.skip || 0).toString(),
      ...params,
    });

    return this.makeAuthenticatedRequest(
      `${this.clubUrl}transactions?${queryParams}`,
      { headers: { 'X-Spond-Clubid': clubId } }
    );
  }

  async createPaymentRequest(
    clubId: string,
    request: CreatePaymentRequest
  ): Promise<any> {
    return this.makeAuthenticatedRequest(`${this.clubUrl}payments`, {
      method: 'POST',
      headers: { 'X-Spond-Clubid': clubId },
      body: JSON.stringify(request),
    });
  }

  // Member relationship methods
  async addGuardian(
    memberId: string,
    guardian: Omit<Guardian, 'id'>
  ): Promise<Guardian> {
    return this.makeAuthenticatedRequest(
      `${this.baseUrl}members/${memberId}/guardians`,
      {
        method: 'POST',
        body: JSON.stringify(guardian),
      }
    );
  }

  // Notification methods
  async updateNotificationSettings(
    userId: string,
    settings: NotificationSettings
  ): Promise<NotificationSettings> {
    return this.makeAuthenticatedRequest(
      `${this.baseUrl}users/${userId}/notifications/settings`,
      {
        method: 'PUT',
        body: JSON.stringify(settings),
      }
    );
  }

  // Calendar integration
  async getICalFeed(userId: string): Promise<string> {
    const response = await fetch(
      `${this.baseUrl}users/${userId}/calendar/ical`,
      { headers: this.getAuthHeaders() }
    );
    return response.text();
  }

  private getAuthHeaders(): HeadersInit {
    if (!this.token) throw new Error('Not authenticated');
    return {
      Authorization: `Bearer ${this.token}`,
      'Content-Type': 'application/json',
    };
  }
}

// Rate limiting implementation
class RateLimiter {
  private requests: number[] = [];

  constructor(
    private maxRequests: number,
    private windowMs: number
  ) {}

  async waitForAvailability(): Promise<void> {
    const now = Date.now();
    this.requests = this.requests.filter(time => now - time < this.windowMs);

    if (this.requests.length >= this.maxRequests) {
      const oldestRequest = Math.min(...this.requests);
      const waitTime = this.windowMs - (now - oldestRequest);
      await new Promise(resolve => setTimeout(resolve, waitTime));
      return this.waitForAvailability();
    }

    this.requests.push(now);
  }
}
```

## Error Handling & Resilience (Enhanced)

### Advanced Error Classification

```typescript
export class SpondErrorHandler {
  static classify(error: any): ErrorType {
    if (
      error.message?.includes('401') ||
      error.message?.includes('Authentication')
    ) {
      return 'AUTH_EXPIRED';
    }
    if (
      error.message?.includes('429') ||
      error.message?.includes('rate limit')
    ) {
      return 'RATE_LIMITED';
    }
    if (error.message?.includes('1002')) {
      return 'LOGIN_LIMIT_EXCEEDED';
    }
    if (
      error.message?.includes('network') ||
      error.message?.includes('timeout')
    ) {
      return 'NETWORK_ERROR';
    }
    if (error.message?.includes('API changed') || error.status === 404) {
      return 'API_CHANGED';
    }
    return 'UNKNOWN';
  }

  static getRecoveryStrategy(errorType: ErrorType): RecoveryStrategy {
    switch (errorType) {
      case 'AUTH_EXPIRED':
        return { action: 'REAUTHENTICATE', backoffMs: 1000 };
      case 'RATE_LIMITED':
        return { action: 'BACKOFF', backoffMs: 60000 };
      case 'LOGIN_LIMIT_EXCEEDED':
        return { action: 'PAUSE', backoffMs: 3600000 }; // 1 hour
      case 'NETWORK_ERROR':
        return { action: 'RETRY', backoffMs: 5000 };
      case 'API_CHANGED':
        return { action: 'ALERT_ADMIN', backoffMs: 86400000 }; // 24 hours
      default:
        return { action: 'RETRY', backoffMs: 10000 };
    }
  }
}

// Circuit breaker implementation
export class SpondCircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';

  constructor(
    private failureThreshold = 5,
    private timeout = 60000 // 1 minute
  ) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime >= this.timeout) {
        this.state = 'HALF_OPEN';
      } else {
        throw new Error('Circuit breaker is OPEN');
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failures = 0;
    this.state = 'CLOSED';
  }

  private onFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();

    if (this.failures >= this.failureThreshold) {
      this.state = 'OPEN';
    }
  }
}
```

## Security Considerations (Enhanced)

### 1. Credential Management

```typescript
// Enhanced credential security
export class SecureSpondCredentials {
  static async store(
    userId: string,
    credentials: SpondCredentials
  ): Promise<void> {
    const encrypted = await this.encrypt(credentials);
    await database.spondCredentials.upsert({
      where: { userId },
      data: {
        encryptedEmail: encrypted.email,
        encryptedPassword: encrypted.password,
        lastUpdated: new Date(),
        consentGranted: true,
        consentDate: new Date(),
      },
    });
  }

  static async retrieve(userId: string): Promise<SpondCredentials | null> {
    const stored = await database.spondCredentials.findUnique({
      where: { userId },
    });

    if (!stored || !stored.consentGranted) return null;

    return this.decrypt({
      email: stored.encryptedEmail,
      password: stored.encryptedPassword,
    });
  }

  private static async encrypt(
    credentials: SpondCredentials
  ): Promise<EncryptedCredentials> {
    // Use proper encryption with user-specific keys
    const key = await this.getUserEncryptionKey(credentials.userId);
    return {
      email: await aesEncrypt(credentials.email, key),
      password: await aesEncrypt(credentials.password, key),
    };
  }
}
```

### 2. Audit Logging

```typescript
export class SpondAuditLogger {
  static async logAPIAccess(
    userId: string,
    endpoint: string,
    method: string,
    success: boolean,
    metadata?: any
  ): Promise<void> {
    await database.auditLog.create({
      data: {
        userId,
        service: 'spond',
        endpoint,
        method,
        success,
        timestamp: new Date(),
        metadata,
        ipAddress: this.getCurrentIP(),
        userAgent: this.getCurrentUserAgent(),
      },
    });
  }

  static async getUsageStatistics(userId: string): Promise<UsageStats> {
    const logs = await database.auditLog.findMany({
      where: { userId, service: 'spond' },
      orderBy: { timestamp: 'desc' },
      take: 1000,
    });

    return {
      totalRequests: logs.length,
      successRate: logs.filter(l => l.success).length / logs.length,
      lastAccess: logs[0]?.timestamp,
      mostUsedEndpoints: this.calculateTopEndpoints(logs),
    };
  }
}
```

### 3. GDPR Compliance

```typescript
export class SpondGDPRHandler {
  static async requestDataExport(userId: string): Promise<UserDataExport> {
    const [credentials, auditLogs, syncData] = await Promise.all([
      database.spondCredentials.findUnique({ where: { userId } }),
      database.auditLog.findMany({ where: { userId, service: 'spond' } }),
      database.spondSyncData.findMany({ where: { userId } }),
    ]);

    return {
      personalData: {
        hasStoredCredentials: !!credentials,
        consentDate: credentials?.consentDate,
        lastSync: syncData[0]?.lastSync,
      },
      usageData: {
        totalAPIRequests: auditLogs.length,
        dateRange: {
          from: auditLogs[auditLogs.length - 1]?.timestamp,
          to: auditLogs[0]?.timestamp,
        },
      },
      syncedData: syncData.map(item => ({
        dataType: item.type,
        lastUpdated: item.updatedAt,
        itemCount: item.itemCount,
      })),
    };
  }

  static async deleteUserData(userId: string): Promise<DeletionReport> {
    const deletionPromises = [
      database.spondCredentials.deleteMany({ where: { userId } }),
      database.auditLog.deleteMany({ where: { userId, service: 'spond' } }),
      database.spondSyncData.deleteMany({ where: { userId } }),
    ];

    const results = await Promise.allSettled(deletionPromises);

    return {
      credentialsDeleted: results[0].status === 'fulfilled',
      auditLogsDeleted: results[1].status === 'fulfilled',
      syncDataDeleted: results[2].status === 'fulfilled',
      deletionDate: new Date(),
    };
  }
}
```

## Testing & Monitoring (Enhanced)

### 1. Comprehensive Testing Strategy

```typescript
// Mock API for development
export class MockSpondAPI extends EnhancedSpondAPI {
  private mockData: MockDataSet;
  private simulateErrors: boolean = false;

  constructor(mockData: MockDataSet) {
    super();
    this.mockData = mockData;
  }

  async getEvents(params: EventsParams = {}): Promise<Event[]> {
    if (this.simulateErrors && Math.random() > 0.8) {
      throw new Error('Simulated API error');
    }

    await this.simulateDelay(100, 500);
    return this.mockData.events.filter(event =>
      this.matchesParams(event, params)
    );
  }

  private async simulateDelay(min: number, max: number): Promise<void> {
    const delay = Math.random() * (max - min) + min;
    await new Promise(resolve => setTimeout(resolve, delay));
  }
}

// Integration tests
describe('Spond API Integration', () => {
  let api: EnhancedSpondAPI;
  let mockAPI: MockSpondAPI;

  beforeEach(() => {
    mockAPI = new MockSpondAPI(testData);
    api = process.env.NODE_ENV === 'test' ? mockAPI : new EnhancedSpondAPI();
  });

  test('handles authentication failures gracefully', async () => {
    mockAPI.simulateErrors = true;

    await expect(async () => {
      await api.login('invalid@email.com', 'wrongpassword');
    }).rejects.toThrow('Authentication failed');
  });

  test('implements circuit breaker correctly', async () => {
    const circuitBreaker = new SpondCircuitBreaker();
    mockAPI.simulateErrors = true;

    // Trigger circuit breaker
    for (let i = 0; i < 5; i++) {
      await expect(
        circuitBreaker.execute(() => api.getEvents())
      ).rejects.toThrow();
    }

    // Circuit should be open now
    await expect(circuitBreaker.execute(() => api.getEvents())).rejects.toThrow(
      'Circuit breaker is OPEN'
    );
  });
});
```

### 2. Monitoring & Alerting

```typescript
export class SpondMonitoring {
  static async checkAPIHealth(): Promise<HealthStatus> {
    const api = new EnhancedSpondAPI();
    const startTime = Date.now();

    try {
      // Test login with dummy credentials
      await api.login('health@check.com', 'dummy');
    } catch (error) {
      const responseTime = Date.now() - startTime;
      const status = this.classifyHealthError(error, responseTime);

      if (status.severity === 'CRITICAL') {
        await this.sendAlert(status);
      }

      return status;
    }

    return {
      status: 'HEALTHY',
      responseTime: Date.now() - startTime,
      timestamp: new Date(),
    };
  }

  static async trackUsageMetrics(): Promise<UsageMetrics> {
    const [totalUsers, activeUsers, errorRate] = await Promise.all([
      database.spondCredentials.count(),
      database.auditLog.count({
        where: {
          service: 'spond',
          timestamp: { gte: new Date(Date.now() - 86400000) }, // 24 hours
        },
      }),
      this.calculateErrorRate(),
    ]);

    return {
      totalUsers,
      activeUsers,
      errorRate,
      timestamp: new Date(),
    };
  }

  private static async sendAlert(status: HealthStatus): Promise<void> {
    // Integration with monitoring services
    const alert = {
      service: 'spond-api',
      severity: status.severity,
      message: status.message,
      timestamp: status.timestamp,
    };

    await Promise.all([
      // Send to Slack
      this.sendSlackAlert(alert),
      // Send to email
      this.sendEmailAlert(alert),
      // Log to monitoring service
      this.logToMonitoring(alert),
    ]);
  }
}
```

## Summary & Recommendations

### Current State

- **No official API** exists or is planned by Spond
- **Community libraries** provide production-ready solutions
- **Extensive functionality** available through reverse engineering
- **Active maintenance** by dedicated community developers

### Integration Approach

1. **Primary**: Use the **Olen/Spond Python library** as your foundation
2. **Secondary**: Implement custom TypeScript wrapper for advanced features
3. **Documentation**: Reference **martcl/spond Swagger docs** for endpoint discovery
4. **Monitoring**: Track community libraries for updates and new discoveries

### Risk Mitigation

1. **Multiple fallbacks**: Implement Python library + custom API + graceful degradation
2. **Version tracking**: Monitor all community libraries for breaking changes
3. **Circuit breakers**: Protect against API failures and changes
4. **User consent**: Implement proper GDPR-compliant data handling
5. **Error classification**: Handle different failure modes appropriately

### Long-term Strategy

- **Stay engaged** with the community (GitHub issues, discussions)
- **Contribute back** any new endpoint discoveries
- **Monitor Spond's business** for potential official API announcements
- **Prepare alternatives** in case the unofficial API becomes unusable

The Spond API ecosystem demonstrates how community determination can create substantial value even when official support is unavailable. Your integration strategy should leverage these community efforts while maintaining resilience against the inherent instability of reverse-engineered APIs.
