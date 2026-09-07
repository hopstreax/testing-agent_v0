"""Action dispatcher resolving element locators and executing browser actions."""

import time
from typing import Any, Tuple
from app.models.actions import ActionResult, AgentAction, ClickAction, FillAction


class ActionDispatcher:
    """Dispatches typed actions against a Patchright Page using a deterministic locator ladder."""

    def __init__(self, default_timeout_ms: int = 7000) -> None:
        self.default_timeout_ms = default_timeout_ms

    def resolve_locator(self, page: Any, action: AgentAction) -> Tuple[Any, str]:
        """Resolve element locator using priority ladder:
        1. Role + Name
        2. Text
        3. Placeholder / Label
        4. CSS / test-id Selector
        """
        # 1. ARIA Role & Name
        if action.role:
            if action.name:
                return (
                    page.get_by_role(action.role, name=action.name, exact=False),
                    f"role={action.role}, name={action.name}",
                )
            return (page.get_by_role(action.role), f"role={action.role}")

        # 2. Text Content
        if action.text:
            return (page.get_by_text(action.text, exact=False), f"text='{action.text}'")

        # 3. Placeholder / Label
        if action.placeholder:
            return (page.get_by_placeholder(action.placeholder), f"placeholder='{action.placeholder}'")
        if action.label:
            return (page.get_by_label(action.label), f"label='{action.label}'")

        # 4. CSS / Selector
        if action.selector:
            return (page.locator(action.selector), f"selector='{action.selector}'")

        raise ValueError("Action does not contain any valid locator criteria (role, text, placeholder, label, selector).")

    async def execute(
        self,
        page: Any,
        action: AgentAction,
        timeout_ms: int = 7000,
    ) -> ActionResult:
        """Execute a typed browser action with strict timeout and duration tracking."""
        start_time = time.perf_counter()
        timeout = timeout_ms or self.default_timeout_ms

        try:
            locator, resolved_by = self.resolve_locator(page, action)

            if isinstance(action, FillAction):
                await locator.fill(action.value, timeout=timeout)
            elif isinstance(action, ClickAction):
                await locator.click(
                    button=action.button,
                    click_count=action.click_count,
                    timeout=timeout,
                )
            else:
                raise NotImplementedError(f"Action type '{action.action_type}' is not supported in Milestone 1.")

            duration_ms = int((time.perf_counter() - start_time) * 1000)
            return ActionResult(
                success=True,
                action_type=action.action_type,
                duration_ms=duration_ms,
                resolved_by=resolved_by,
            )

        except Exception as exc:
            duration_ms = int((time.perf_counter() - start_time) * 1000)
            return ActionResult(
                success=False,
                action_type=action.action_type,
                duration_ms=duration_ms,
                resolved_by=locals().get("resolved_by"),
                error_message=str(exc),
            )
