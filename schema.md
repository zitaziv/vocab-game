Challenge Schema (chapters/chapter-*.json)

Each chapter file is an array of challenge objects.

Required fields:
- scene (string)
- sceneZh (string)
- npc (string)
- npcZh (string)
- dialogue (array of lines)
- followUp (array of lines)
- sentence (string)
- sentenceZh (string)
- answer (string)
- answerZh (string)
- hints (array)
- grammar (array)

Optional fields:
- sceneImage (string)
- origin / originZh (string)
- context / contextZh (string)
- pos / posZh (string)
- category / categoryZh (string)
- thinkingHints (array of { tier, en, zh })
- bridge (object { en, zh })

Line object (dialogue/followUp):
- speaker / speakerZh (string)
- text / textZh (string)
- side ("left" | "right")
