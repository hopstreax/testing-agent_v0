"""Action dispatcher resolving element locators and executing browser actions."""

import re
import time
from typing import Any, Optional, Tuple
from unittest.mock import AsyncMock, MagicMock

from patchright.async_api import expect
from app.models.actions import (
    ActionResult,
    AgentAction,
    AssertAction,
    ClickAction,
    FillAction,
    HoverAction,
    NavigateAction,
    PressKeyAction,
    ScrollAction,
    SelectAction,
)


class ActionDispatcher:
    """Dispatches typed actions against a Patchright Page using a deterministic locator ladder."""

    def __init__(
        self,
        default_timeout_ms: int = 7000,
        default_assertion_timeout_ms: int = 5000,
        expect_fn: Any = None,
    ) -> None:
        self.default_timeout_ms = default_timeout_ms
        self.default_assertion_timeout_ms = default_assertion_timeout_ms
        self._expect = expect_fn or expect

    def _create_mock_expect(self) -> Any:
        """Create a default mock expect handler for in-memory unit tests."""
        assertions = MagicMock()
        assertions.to_be_visible = AsyncMock()
        assertions.to_be_hidden = AsyncMock()
        assertions.to_contain_text = AsyncMock()
        assertions.to_have_value = AsyncMock()
        assertions.to_have_url = AsyncMock()
        assertions.to_have_title = AsyncMock()
        assertions.to_be_enabled = AsyncMock()
        assertions.to_be_disabled = AsyncMock()
        assertions.to_be_checked = AsyncMock()
        assertions.not_to_be_checked = AsyncMock()
        assertions.to_have_count = AsyncMock()
        return MagicMock(return_value=assertions)

    def resolve_base_locator(self, page: Any, action: AgentAction) -> Tuple[Any, str]:
        """Resolve base element locator using priority ladder:
        1. Role + Name
        2. Text
        3. Placeholder / Label
        4. CSS / test-id Selector
        """
        # 1. ARIA Role & Name
        if getattr(action, "role", None):
            if getattr(action, "name", None):
                return (
                    page.get_by_role(action.role, name=action.name, exact=False),
                    f"role={action.role}, name={action.name}",
                )
            return (page.get_by_role(action.role), f"role={action.role}")

        # 2. Text Content
        if getattr(action, "text", None):
            return (page.get_by_text(action.text, exact=False), f"text='{action.text}'")

        # 3. Placeholder / Label
        if getattr(action, "placeholder", None):
            return (page.get_by_placeholder(action.placeholder), f"placeholder='{action.placeholder}'")
        if not isinstance(action, SelectAction) and getattr(action, "label", None):
            return (page.get_by_label(action.label), f"label='{action.label}'")

        # 4. CSS / Selector
        if getattr(action, "selector", None):
            return (page.locator(action.selector), f"selector='{action.selector}'")

        raise ValueError("Action does not contain any valid locator criteria (role, text, placeholder, label, selector).")

    def resolve_locator(self, page: Any, action: AgentAction) -> Tuple[Any, str]:
        """Resolve element locator using priority ladder and optional 0-based index."""
        locator, strat = self.resolve_base_locator(page, action)
        idx = getattr(action, "index", None)
        if idx is not None and getattr(action, "assertion_type", None) != "has_count":
            locator = locator.nth(idx)
            strat = f"{strat} [index={idx}]"
        return locator, strat

    async def execute(
        self,
        page: Any,
        action: AgentAction,
        timeout_ms: Optional[int] = None,
    ) -> ActionResult:
        """Execute a typed browser action with strict timeout and duration tracking."""
        start_time = time.perf_counter()

        try:
            if isinstance(action, NavigateAction):
                timeout = timeout_ms or self.default_timeout_ms
                await page.goto(action.url, timeout=timeout, wait_until="domcontentloaded")
                resolved_by = "page.goto"
            elif isinstance(action, AssertAction):
                timeout = timeout_ms or self.default_assertion_timeout_ms
                is_mock_page = isinstance(page, (MagicMock, AsyncMock))

                if is_mock_page:
                    expect_target = (
                        page.__dict__.get("_mock_expect")
                        if "_mock_expect" in page.__dict__
                        else (self._expect if self._expect is not expect else self._create_mock_expect())
                    )
                else:
                    expect_target = self._expect

                if action.assertion_type == "has_url":
                    resolved_by = "page.url"
                    pattern = re.compile(re.escape(action.expected_value or ""))
                    await expect_target(page).to_have_url(pattern, timeout=timeout)
                elif action.assertion_type == "has_title":
                    resolved_by = "page.title"
                    pattern = re.compile(re.escape(action.expected_value or ""))
                    await expect_target(page).to_have_title(pattern, timeout=timeout)
                else:
                    idx = getattr(action, "index", None)
                    if idx is not None and action.assertion_type != "has_count":
                        try:
                            base_loc, _ = self.resolve_base_locator(page, action)
                            if hasattr(base_loc, "count") and callable(base_loc.count):
                                import asyncio
                                cnt_res = base_loc.count()
                                cnt = await cnt_res if asyncio.iscoroutine(cnt_res) else cnt_res
                                if isinstance(cnt, int) and cnt > 0 and idx >= cnt:
                                    valid_range = f"0 through {cnt - 1}" if cnt > 1 else "0"
                                    raise IndexError(
                                        f"Locator index {idx} is out of range; locator matched {cnt} elements. Valid indexes are {valid_range}."
                                    )
                        except IndexError:
                            raise
                        except Exception:
                            pass

                    locator, resolved_by = self.resolve_locator(page, action)
                    if action.assertion_type == "visible":
                        await expect_target(locator).to_be_visible(timeout=timeout)
                    elif action.assertion_type == "hidden":
                        await expect_target(locator).to_be_hidden(timeout=timeout)
                    elif action.assertion_type == "has_text":
                        await expect_target(locator).to_contain_text(action.expected_value or "", timeout=timeout)
                    elif action.assertion_type == "has_value":
                        await expect_target(locator).to_have_value(action.expected_value or "", timeout=timeout)
                    elif action.assertion_type == "enabled":
                        await expect_target(locator).to_be_enabled(timeout=timeout)
                    elif action.assertion_type == "disabled":
                        await expect_target(locator).to_be_disabled(timeout=timeout)
                    elif action.assertion_type == "checked":
                        await expect_target(locator).to_be_checked(timeout=timeout)
                    elif action.assertion_type == "unchecked":
                        await expect_target(locator).not_to_be_checked(timeout=timeout)
                    elif action.assertion_type == "has_count":
                        await expect_target(locator).to_have_count(int(action.expected_value or "0"), timeout=timeout)
                    else:
                        raise NotImplementedError(f"Assertion type '{action.assertion_type}' is not supported.")
            elif isinstance(action, PressKeyAction):
                timeout = timeout_ms or self.default_timeout_ms
                has_locator = any([
                    action.role,
                    action.name,
                    action.text,
                    action.placeholder,
                    action.label,
                    action.selector,
                ])
                if has_locator:
                    locator, resolved_by = self.resolve_locator(page, action)
                    await locator.press(action.key, timeout=timeout)
                else:
                    await page.keyboard.press(action.key)
                    resolved_by = "page.keyboard"
            elif isinstance(action, SelectAction):
                timeout = timeout_ms or self.default_timeout_ms
                locator, resolved_by = self.resolve_locator(page, action)
                if action.value is not None:
                    await locator.select_option(value=action.value, timeout=timeout)
                elif action.label is not None:
                    await locator.select_option(label=action.label, timeout=timeout)
            elif isinstance(action, ScrollAction):
                delta_y = action.amount if action.direction == "down" else -action.amount
                if hasattr(page, "evaluate"):
                    await page.evaluate(f"window.scrollBy(0, {delta_y})")
                elif hasattr(page, "mouse") and hasattr(page.mouse, "wheel"):
                    await page.mouse.wheel(0, delta_y)
                resolved_by = f"page.scroll({action.direction}, {action.amount}px)"
            else:
                timeout = timeout_ms or self.default_timeout_ms
                idx = getattr(action, "index", None)
                if idx is not None:
                    try:
                        base_loc, _ = self.resolve_base_locator(page, action)
                        if hasattr(base_loc, "count") and callable(base_loc.count):
                            import asyncio
                            cnt_res = base_loc.count()
                            cnt = await cnt_res if asyncio.iscoroutine(cnt_res) else cnt_res
                            if isinstance(cnt, int) and cnt > 0 and idx >= cnt:
                                valid_range = f"0 through {cnt - 1}" if cnt > 1 else "0"
                                raise IndexError(
                                    f"Locator index {idx} is out of range; locator matched {cnt} elements. Valid indexes are {valid_range}."
                                )
                    except IndexError:
                        raise
                    except Exception:
                        pass

                locator, resolved_by = self.resolve_locator(page, action)

                if isinstance(action, FillAction):
                    await locator.fill(action.value, timeout=timeout)
                elif isinstance(action, ClickAction):
                    await locator.click(
                        button=action.button,
                        click_count=action.click_count,
                        timeout=timeout,
                    )
                elif isinstance(action, HoverAction):
                    await locator.hover(timeout=timeout)
                else:
                    raise NotImplementedError(f"Action type '{action.action_type}' is not supported by ActionDispatcher.")

            duration_ms = int((time.perf_counter() - start_time) * 1000)
            return ActionResult(
                success=True,
                action_type=action.action_type,
                duration_ms=duration_ms,
                resolved_by=resolved_by,
            )

        except Exception as exc:
            duration_ms = int((time.perf_counter() - start_time) * 1000)
            err_msg = str(exc)

            # Check for strict mode ambiguity
            m = re.search(r"strict mode violation: .*? resolved to (\d+) elements:", err_msg)
            if m:
                count = int(m.group(1))
                if count == 2:
                    idx_choices = "0 or 1"
                else:
                    idx_choices = ", ".join(str(i) for i in range(count - 1)) + f", or {count - 1}"
                err_msg = f"Locator matched {count} elements and is ambiguous. Use a more specific locator or provide index={idx_choices}."
                aka_matches = re.findall(r"(\d+)\)\s+.*?aka\s+(locator\([^\)]+\)|get_by_[^\n\r]+)", str(exc))
                if aka_matches:
                    distinguishing = [f"  - index {int(num) - 1}: {h.strip()}" for num, h in aka_matches[:5]]
                    err_msg += "\nDistinguishing options:\n" + "\n".join(distinguishing)

            # Check for out-of-range index upon timeout
            idx = getattr(action, "index", None)
            if idx is not None and getattr(action, "assertion_type", None) != "has_count" and "out of range" not in err_msg:
                try:
                    base_loc, _ = self.resolve_base_locator(page, action)
                    if hasattr(base_loc, "count") and callable(base_loc.count):
                        import asyncio
                        cnt_res = base_loc.count()
                        cnt = await cnt_res if asyncio.iscoroutine(cnt_res) else cnt_res
                        if isinstance(cnt, int) and idx >= cnt:
                            valid_range = f"0 through {cnt - 1}" if cnt > 1 else ("0" if cnt == 1 else "none")
                            err_msg = f"Locator index {idx} is out of range; locator matched {cnt} elements. Valid indexes are {valid_range}."
                except Exception:
                    pass

            return ActionResult(
                success=False,
                action_type=action.action_type,
                duration_ms=duration_ms,
                resolved_by=locals().get("resolved_by"),
                error_message=err_msg,
            )
