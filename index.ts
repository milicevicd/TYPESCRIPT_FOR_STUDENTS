const HTTP_POST_METHOD = 'POST' as const;
const HTTP_GET_METHOD = 'GET' as const;

const HTTP_STATUS_OK = 200 as const;
const HTTP_STATUS_INTERNAL_SERVER_ERROR = 500 as const;

type StatusCode = typeof HTTP_STATUS_OK | typeof HTTP_STATUS_INTERNAL_SERVER_ERROR;

type Role = 'user' | 'admin';

interface User {
  name: string;
  age: number;
  roles: ReadonlyArray<Role>;
  createdAt: Date;
  isDeleated: boolean;
}

type PostRequest = {
  method: typeof HTTP_POST_METHOD;
  host: string;
  path: string;
  body: User;
  params: Record<string, never>;
};

type GetRequest = {
  method: typeof HTTP_GET_METHOD;
  host: string;
  path: string;
  params: { id: string };
  body?: never;
};

type AppRequest = PostRequest | GetRequest;

interface AppResponse {
  status: StatusCode;
}

interface AppError {
  message: string;
  code?: number;
  cause?: Error;
}

interface ObserverHandlers<T> {
  next?: (value: T) => void;
  error?: (err: AppError) => void;
  complete?: () => void;
}

type Unsubscribe = () => void;
type Subscribe<T> = (observer: Observer<T>) => Unsubscribe | void;

class Observer<T> {
  private handlers: ObserverHandlers<T>;
  private isUnsubscribed = false;
  public _unsubscribe?: Unsubscribe;

  constructor(handlers: ObserverHandlers<T>) {
    this.handlers = handlers;
  }

  next(value: T): void {
    if (!this.isUnsubscribed) this.handlers.next?.(value);
  }

  error(error: AppError): void {
    if (!this.isUnsubscribed) {
      this.handlers.error?.(error);
      this.unsubscribe();
    }
  }

  complete(): void {
    if (!this.isUnsubscribed) {
      this.handlers.complete?.();
      this.unsubscribe();
    }
  }

  unsubscribe(): void {
    if (this.isUnsubscribed) return;
    this.isUnsubscribed = true;
    this._unsubscribe?.();
  }
}

class Observable<T> {
  private _subscribe: Subscribe<T>;

  constructor(subscribe: Subscribe<T>) {
    this._subscribe = subscribe;
  }

  static from<U>(values: ReadonlyArray<U>): Observable<U> {
    return new Observable<U>((observer) => {
      values.forEach((v) => observer.next(v));
      observer.complete();
      return () => console.log('unsubscribed');
    });
  }

  subscribe(handlers: ObserverHandlers<T>): { unsubscribe: () => void } {
    const observer = new Observer<T>(handlers);
    const cleanup = this._subscribe(observer);
    if (cleanup) observer._unsubscribe = cleanup;
    return { unsubscribe: () => observer.unsubscribe() };
  }
}

const userMock: User = {
  name: 'User Name',
  age: 26,
  roles: ['user', 'admin'],
  createdAt: new Date(),
  isDeleated: false,
};

const requestsMock: ReadonlyArray<AppRequest> = [
  {
    method: HTTP_POST_METHOD,
    host: 'service.example',
    path: 'user',
    body: userMock,
    params: {},
  },
  {
    method: HTTP_GET_METHOD,
    host: 'service.example',
    path: 'user',
    params: { id: '3f5h67s4s' },
  },
];

const handleRequest = (_req: AppRequest): AppResponse => ({ status: HTTP_STATUS_OK });
const handleError = (_err: AppError): AppResponse => ({ status: HTTP_STATUS_INTERNAL_SERVER_ERROR });
const handleComplete = (): void => console.log('complete');

const requests$ = Observable.from(requestsMock);

const subscription = requests$.subscribe({
  next: handleRequest,
  error: handleError,
  complete: handleComplete,
});

subscription.unsubscribe();
