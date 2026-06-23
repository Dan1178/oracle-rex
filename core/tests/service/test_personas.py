from django.test import SimpleTestCase
from langchain_core.messages import HumanMessage, SystemMessage

from core.service.ai import personas


class ApplyPersonaTests(SimpleTestCase):
    def test_default_and_none_are_noops(self):
        msgs = [SystemMessage(content="base"), HumanMessage(content="q")]
        self.assertIs(personas.apply_persona(msgs, "default"), msgs)
        self.assertIs(personas.apply_persona(msgs, None), msgs)

    def test_unknown_persona_is_noop(self):
        msgs = [SystemMessage(content="base")]
        self.assertIs(personas.apply_persona(msgs, "does-not-exist"), msgs)

    def test_persona_merges_into_leading_system_message(self):
        msgs = [SystemMessage(content="BASE SYSTEM"), HumanMessage(content="q")]
        out = personas.apply_persona(msgs, "oracle")
        # Original system content is preserved...
        self.assertIn("BASE SYSTEM", out[0].content)
        # ...with the persona flavor prepended...
        self.assertIn("oracle", out[0].content.lower())
        # ...and the accuracy/safety guardrail appended.
        self.assertIn("accurate", out[0].content.lower())
        # The human turn is untouched, and the input list isn't mutated.
        self.assertEqual(out[1].content, "q")
        self.assertEqual(msgs[0].content, "BASE SYSTEM")
