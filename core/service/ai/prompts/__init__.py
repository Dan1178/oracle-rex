"""Prompt construction for each AI feature.

Each module exposes a ``build_messages(...)`` function that returns a list of
LangChain message objects. Keeping all prompt text here means it is never
scattered through views or client code.
"""
