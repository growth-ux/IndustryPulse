import os
import httpx
from typing import Dict
from app.config import settings

class AIService:
    def __init__(self):
        self.provider = settings.ai_provider
        self.openai_key = settings.openai_api_key or os.getenv("OPENAI_API_KEY")
        self.anthropic_key = settings.anthropic_api_key or os.getenv("ANTHROPIC_API_KEY")
        self.qwen_key = settings.qwen_api_key or os.getenv("QWEN_API_KEY")

    async def generate_commentary(self, title: str, summary: str, event_type: str) -> str:
        """生成AI点评"""
        if self.provider == "qwen" and self.qwen_key:
            return await self._qwen_commentary(title, summary, event_type)
        elif self.provider == "openai" and self.openai_key:
            return await self._openai_commentary(title, summary, event_type)
        elif self.provider == "anthropic" and self.anthropic_key:
            return await self._anthropic_commentary(title, summary, event_type)
        else:
            return self._rule_based_commentary(title, event_type)

    async def _qwen_commentary(self, title: str, summary: str, event_type: str) -> str:
        """使用通义千问生成点评"""
        from openai import OpenAI
        client = OpenAI(
            api_key=self.qwen_key,
            base_url="https://dashscope.aliyuncs.com/compatible-mode/v1",
        )
        prompt = f"""请为以下新闻生成50字以内的影响点评：

标题：{title}
摘要：{summary}

要求：
1. 50字以内
2. 简洁有力
3. 聚焦影响

点评："""

        completion = client.chat.completions.create(
            model="qwen3.5-27b",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=100,
            temperature=0.7,
        )
        return completion.choices[0].message.content.strip()

    async def _openai_commentary(self, title: str, summary: str, event_type: str) -> str:
        """使用OpenAI生成点评"""
        prompt = f"""请为以下新闻生成50字以内的影响点评：

标题：{title}
摘要：{summary}

要求：
1. 50字以内
2. 简洁有力
3. 聚焦影响

点评："""

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                "https://api.openai.com/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {self.openai_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": "gpt-4o-mini",
                    "messages": [{"role": "user", "content": prompt}],
                    "max_tokens": 100,
                    "temperature": 0.7,
                },
            )
            result = response.json()
            return result["choices"][0]["message"]["content"].strip()

    async def _anthropic_commentary(self, title: str, summary: str, event_type: str) -> str:
        """使用Claude生成点评"""
        prompt = f"""请为以下新闻生成50字以内的影响点评：

标题：{title}
摘要：{summary}

要求：50字以内，简洁有力，聚焦影响。

点评："""

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                "https://api.anthropic.com/v1/messages",
                headers={
                    "x-api-key": self.anthropic_key,
                    "anthropic-version": "2023-06-01",
                    "Content-Type": "application/json",
                },
                json={
                    "model": "claude-3-haiku-20240307",
                    "max_tokens": 100,
                    "messages": [{"role": "user", "content": prompt}],
                },
            )
            result = response.json()
            return result["content"][0]["text"].strip()

    def _rule_based_commentary(self, title: str, event_type: str) -> str:
        """基于规则生成简单点评（无API时使用）"""
        type_commentary = {
            "policy": "政策发布将影响行业走向，需密切关注实施细则。",
            "funding": "融资事件表明资本市场对该领域持续看好。",
            "product": "新产品发布将加剧市场竞争格局变化。",
            "ma": "并购整合将重塑行业竞争态势。",
            "tech": "技术突破可能带来新的商业机会。",
            "report": "财报数据反映公司经营状况。",
            "person": "人事变动可能影响公司战略方向。",
            "other": "该事件值得关注。",
        }
        return type_commentary.get(event_type, "该事件值得关注。")

    def get_type_name(self, event_type: str) -> str:
        """获取类型中文名"""
        type_names = {
            "policy": "政策",
            "funding": "融资",
            "product": "产品发布",
            "ma": "并购",
            "tech": "技术突破",
            "report": "财报",
            "person": "人物",
            "other": "其他",
        }
        return type_names.get(event_type, "其他")

ai_service = AIService()
