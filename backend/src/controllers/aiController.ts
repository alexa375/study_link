import { Request, Response } from 'express';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { PromptTemplate } from '@langchain/core/prompts';
import { driver } from '../config/neo4j';

// Initialize the LLM
// Langchain expects GOOGLE_API_KEY by default, so we pass it explicitly from our env var
const llm = new ChatGoogleGenerativeAI({
    model: 'gemini-2.5-flash',
    temperature: 0.7,
    apiKey: process.env.GEMINI_API_KEY
});

// 1. Socratic Prompt Template
const socraticPrompt = PromptTemplate.fromTemplate(`
당신은 위대한 수학자이자 철학자인 소크라테스입니다.
학생이 다음 수학/철학적 개념에 대해 질문했습니다: {concept_name}

개념 설명: {concept_description}

절대로 정답이나 직설적인 정의를 바로 주지 마세요.
대신, 학생 스스로 이 개념의 필요성이나 본질을 깨달을 수 있도록, 생각의 방향을 유도하는 "단 하나의 핵심적인 질문"을 던지세요.
친절하고 철학적인 톤을 유지하세요.

답변:
`);

// 2. Emotional Anchor Prompt Template
const emotionalAnchorPrompt = PromptTemplate.fromTemplate(`
당신은 스토리텔러이자 역사학자입니다.
수학/철학 개념인 '{concept_name}' 에 담긴 역사적 갈등과 위기(Crisis)를 들려주세요.

개념 설명: {concept_description}
역사적 위기: {concept_crisis}

왜 이 개념이 당대 지식인들에게 충격이었는지, 이 개념이 없었을 때 어떤 모순이나 어려움이 있었는지 생생하고 드라마틱하게 3문장 이내로 설명해주세요. 듣는 이가 감정적으로 공감할 수 있도록 하세요.

답변:
`);

// 3. Water Drop (Semantic Zoom/Connection) Prompt Template
const waterDropPrompt = PromptTemplate.fromTemplate(`
당신은 지식의 연결술사입니다.
두 개념 '{source_name}' 와(과) '{target_name}' 사이의 논리적, 철학적 연결고리를 설명해야 합니다.

출발지 개념: {source_name} ({source_desc})
목적지 개념: {target_name} ({target_desc})

출발지 개념에서 떨어지는 지식의 물방울이 어떻게 목적지 개념으로 번져가는지, 두 개념이 왜 서로 의존하거나 발전하게 되었는지 비유적이고 아름다운 표현을 써서 3문장 이내로 설명하세요.

답변:
`);

// Helper Function: Fetch Concept Context from Neo4j
const fetchConceptContext = async (id: string) => {
    const session = driver.session();
    try {
        const result = await session.run('MATCH (c:Concept {id: $id}) RETURN c', { id });
        if (result.records.length === 0) return null;
        return result.records[0].get('c').properties;
    } finally {
        await session.close();
    }
};

export const generateSocraticQuestion = async (req: Request, res: Response) => {
    try {
        const { conceptId } = req.params;
        const concept = await fetchConceptContext(conceptId as string);

        if (!concept) return res.status(404).json({ success: false, error: 'Concept not found' });

        const chain = socraticPrompt.pipe(llm);
        const response = await chain.invoke({
            concept_name: concept.label,
            concept_description: concept.description
        });

        res.json({ success: true, answer: response.content });
    } catch (error: any) {
        console.error('AI Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

export const generateEmotionalAnchor = async (req: Request, res: Response) => {
    try {
        const { conceptId } = req.params;
        const concept = await fetchConceptContext(conceptId as string);

        if (!concept) return res.status(404).json({ success: false, error: 'Concept not found' });

        const chain = emotionalAnchorPrompt.pipe(llm);
        const response = await chain.invoke({
            concept_name: concept.label,
            concept_description: concept.description,
            concept_crisis: concept.crisis || '알려진 구체적인 위기는 없지만, 이 개념이 없던 시기의 공백을 상상해보세요.'
        });

        res.json({ success: true, answer: response.content });
    } catch (error: any) {
        console.error('AI Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

export const generateWaterDropConnection = async (req: Request, res: Response) => {
    try {
        const { sourceId, targetId } = req.query;
        if (!sourceId || !targetId) {
            return res.status(400).json({ success: false, error: 'sourceId and targetId required' });
        }

        const sourceConcept = await fetchConceptContext(sourceId as string);
        const targetConcept = await fetchConceptContext(targetId as string);

        if (!sourceConcept || !targetConcept) {
            return res.status(404).json({ success: false, error: 'One or both concepts not found' });
        }

        const chain = waterDropPrompt.pipe(llm);
        const response = await chain.invoke({
            source_name: sourceConcept.label,
            source_desc: sourceConcept.description,
            target_name: targetConcept.label,
            target_desc: targetConcept.description
        });

        res.json({ success: true, answer: response.content });
    } catch (error: any) {
        console.error('AI Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};
export const generateWaterDropZoom = async (req: Request, res: Response) => {
    try {
        const session = driver.session();
        let masteredConcepts: any[] = [];
        try {
            const result = await session.run(
                "MATCH (c:Concept) RETURN c"
            );
            masteredConcepts = result.records.map(r => r.get('c').properties);
        } finally {
            await session.close();
        }

        if (masteredConcepts.length === 0) {
            return res.status(404).json({ success: false, error: 'No concepts found' });
        }

        const conceptList = masteredConcepts
            .map(c => `- ${c.label}: ${c.description || '설명 없음'}`)
            .join('\n');

        const zoomPrompt = PromptTemplate.fromTemplate(`
당신은 지식 지도를 거시적으로 조망하는 안내자입니다.
학습자의 지식망에 현재 다음 수학/철학 개념들이 있습니다:

{concept_list}

이 개념들을 관통하는 가장 핵심적인 빅 아이디어(Big Ideas) 3~4가지를 추출해 주세요.
각 빅 아이디어는 여러 개별 개념들을 하나의 거시적 주제로 묶는 '물방울'처럼 작동해야 합니다.

반드시 다음 JSON 형식으로만 응답하세요 (JSON 이외의 다른 텍스트 없이):
[
  {{"title": "빅 아이디어 제목", "summary": "2문장 이내 핵심 요약", "emoji": "관련 이모지 1개", "relatedIds": ["관련 개념 id 목록"]}},
  ...
]
        `);

        const chain = zoomPrompt.pipe(llm);
        const response = await chain.invoke({ concept_list: conceptList });

        let content = typeof response.content === 'string' ? response.content : JSON.stringify(response.content);
        // Strip markdown code fences if present
        content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

        const parsed = JSON.parse(content);
        res.json({ success: true, waterDrops: parsed });
    } catch (error: any) {
        console.error('AI WaterDrop Zoom Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

export const generateMetaPattern = async (req: Request, res: Response) => {
    try {
        const { tag } = req.query;
        if (!tag) return res.status(400).json({ success: false, error: 'tag is required' });

        const session = driver.session();
        let matchingConcepts: any[] = [];
        try {
            const result = await session.run(
                "MATCH (c:Concept) WHERE $tag IN c.metaTags RETURN c",
                { tag: tag as string }
            );
            matchingConcepts = result.records.map(r => r.get('c').properties);
        } finally {
            await session.close();
        }

        if (matchingConcepts.length === 0) {
            return res.json({ success: true, matchingIds: [], insight: null });
        }

        const tagStr = tag as string;
        const conceptList = matchingConcepts.map(c => `- ${c.label}: ${c.description || ''}`).join('\n');

        const metaPrompt = PromptTemplate.fromTemplate(`
당신은 수학과 철학을 관통하는 패턴을 연구하는 지식의 고고학자입니다.
다음은 모두 '{tag}' 라는 동일한 메타 철학 태그를 공유하는 수학/철학 개념들입니다:

{concept_list}

이 개념들 사이에 흐르는 공통된 수학적 철학 패턴이 무엇인지 설명해 주세요.
서로 다른 분야에 있지만 같은 구조적 진리(상사성, Self-similarity)를 공유한다는 것을.
3문장 이내로, 놀랍고 통찰력 있게 서술해 주세요.
        `);

        const chain = metaPrompt.pipe(llm);
        const response = await chain.invoke({ tag: tagStr, concept_list: conceptList });

        res.json({
            success: true,
            matchingIds: matchingConcepts.map(c => c.id),
            insight: response.content,
            matchingLabels: matchingConcepts.map(c => c.label)
        });
    } catch (error: any) {
        console.error('AI MetaPattern Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};
