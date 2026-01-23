"""Pagination utilities for Ephemera SDK."""

from typing import Any, AsyncIterator, Callable, Dict, Iterator, List, Optional, TypeVar

T = TypeVar("T")


class PaginatedIterator(Iterator[T]):
    """
    Synchronous iterator for paginated API responses.

    Example:
        for inbox in PaginatedIterator(client, "/inboxes", Inbox):
            print(inbox.address)
    """

    def __init__(
        self,
        request_fn: Callable[[str], Dict[str, Any]],
        endpoint: str,
        model_class: type,
        limit: int = 50,
        max_items: Optional[int] = None,
    ):
        self._request_fn = request_fn
        self._endpoint = endpoint
        self._model_class = model_class
        self._limit = limit
        self._max_items = max_items
        self._cursor: Optional[str] = None
        self._buffer: List[T] = []
        self._item_count = 0
        self._exhausted = False

    def __iter__(self) -> "PaginatedIterator[T]":
        return self

    def __next__(self) -> T:
        if self._max_items and self._item_count >= self._max_items:
            raise StopIteration

        if not self._buffer:
            if self._exhausted:
                raise StopIteration
            self._fetch_next_page()

        if not self._buffer:
            raise StopIteration

        self._item_count += 1
        return self._buffer.pop(0)

    def _fetch_next_page(self) -> None:
        params = f"limit={self._limit}"
        if self._cursor:
            params += f"&cursor={self._cursor}"

        url = f"{self._endpoint}?{params}" if "?" not in self._endpoint else f"{self._endpoint}&{params}"
        response = self._request_fn(url)

        data = response.get("data", [])
        self._buffer = [self._model_class.model_validate(item) for item in data]
        self._cursor = response.get("nextCursor")

        if not self._cursor or not data:
            self._exhausted = True


class AsyncPaginatedIterator(AsyncIterator[T]):
    """
    Async iterator for paginated API responses.

    Example:
        async for inbox in AsyncPaginatedIterator(client, "/inboxes", Inbox):
            print(inbox.address)
    """

    def __init__(
        self,
        request_fn: Callable[[str], Any],  # Returns Awaitable[Dict]
        endpoint: str,
        model_class: type,
        limit: int = 50,
        max_items: Optional[int] = None,
    ):
        self._request_fn = request_fn
        self._endpoint = endpoint
        self._model_class = model_class
        self._limit = limit
        self._max_items = max_items
        self._cursor: Optional[str] = None
        self._buffer: List[T] = []
        self._item_count = 0
        self._exhausted = False

    def __aiter__(self) -> "AsyncPaginatedIterator[T]":
        return self

    async def __anext__(self) -> T:
        if self._max_items and self._item_count >= self._max_items:
            raise StopAsyncIteration

        if not self._buffer:
            if self._exhausted:
                raise StopAsyncIteration
            await self._fetch_next_page()

        if not self._buffer:
            raise StopAsyncIteration

        self._item_count += 1
        return self._buffer.pop(0)

    async def _fetch_next_page(self) -> None:
        params = f"limit={self._limit}"
        if self._cursor:
            params += f"&cursor={self._cursor}"

        url = f"{self._endpoint}?{params}" if "?" not in self._endpoint else f"{self._endpoint}&{params}"
        response = await self._request_fn(url)

        data = response.get("data", [])
        self._buffer = [self._model_class.model_validate(item) for item in data]
        self._cursor = response.get("nextCursor")

        if not self._cursor or not data:
            self._exhausted = True


async def collect_all_async(iterator: AsyncIterator[T]) -> List[T]:
    """Collect all items from an async iterator into a list."""
    items: List[T] = []
    async for item in iterator:
        items.append(item)
    return items


def collect_all(iterator: Iterator[T]) -> List[T]:
    """Collect all items from an iterator into a list."""
    return list(iterator)
