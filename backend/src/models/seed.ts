import { driver } from '../config/neo4j';

const seedData = async () => {
    const session = driver.session();
    try {
        console.log('Seeding Neo4j Database with Math Philosophy Concepts...');

        // Clear existing data for a clean slate
        await session.run(`MATCH (n) DETACH DELETE n`);

        // Create the default Map node
        await session.run(`
            CREATE (m:Map {
                id: 'default',
                name: '수학 개념 지도',
                description: '기초 수학 개념들의 철학적 연결망',
                emoji: '🧮',
                createdAt: datetime()
            })
        `);

        // Create Nodes with rich metaTags
        await session.run(`
            // ========= 집합론 / 논리 기초 =========
            CREATE (c1:Concept {
                id: 'c1', label: '집합(Set)', masteryLevel: 'MASTERED', emotion: '😎',
                mapId: 'default',
                description: '어떤 조건에 따라 결정되는 요소들의 모임. 수학의 가장 근본적인 언어.',
                metaTags: ['Philosophy: Structure', 'Philosophy: Classification'],
                crisis: '칸토르가 무한집합의 크기를 논하자 당시 수학자들은 "무한에 크기가 있다"는 발상 자체를 이단으로 취급했다.'
            })

            // ========= 함수 / 대응 =========
            CREATE (c2:Concept {
                id: 'c2', label: '함수(Function)', masteryLevel: 'MASTERED', emotion: '🤔',
                mapId: 'default',
                description: '두 집합 사이의 특별한 대응 관계: 입력마다 정확히 하나의 출력이 존재한다.',
                metaTags: ['Philosophy: Mapping', 'Philosophy: Structure'],
                crisis: '오일러 시대에는 함수를 "공식으로 표현 가능한 것"으로만 봤다. 푸리에가 불연속 함수를 도입하자 "이게 함수냐?" 논쟁이 폭발했다.'
            })

            // ========= 극한 =========
            CREATE (limit:Concept {
                id: 'limit', label: '극한(Limit)', masteryLevel: 'LEARNING', emotion: '🌊',
                mapId: 'default',
                description: '값이 특정 점에 한없이 가까워질 때 함수가 어디로 수렴하는가.',
                metaTags: ['Philosophy: Infinity', 'Philosophy: Approximation'],
                crisis: '뉴턴과 라이프니츠가 미적분을 발명했지만 "무한히 작은 수"가 도대체 0이냐 아니냐의 모순에 당시 논리학자들은 경악했다.'
            })

            // ========= 연속성 =========
            CREATE (c3:Concept {
                id: 'c3', label: '연속성(Continuity)', masteryLevel: 'LEARNING', emotion: '🤯',
                mapId: 'default',
                description: '끊어지지 않고 이어지는 성질. ε-δ 논법으로 엄밀하게 정의된다.',
                metaTags: ['Philosophy: Approximation', 'Philosophy: Local-to-Global'],
                crisis: '바이어슈트라스가 연속이지만 어디서도 미분 불가능한 함수를 발견하자 "직관적으로 매끄러운 게 수학적으로 날카롭다"는 역설이 터졌다.'
            })

            // ========= 추상화 =========
            CREATE (c4:Concept {
                id: 'c4', label: '추상화(Abstraction)', masteryLevel: 'UNSEEN', emotion: '🔭',
                mapId: 'default',
                description: '구체적인 사물에서 공통된 구조만 뽑아내어 더 넓은 진리를 보는 과정.',
                metaTags: ['Philosophy: Structure', 'Philosophy: Classification']
            })

            // ========= 군(Group) =========
            CREATE (group:Concept {
                id: 'group', label: '군(Group)', masteryLevel: 'UNSEEN', emotion: '♾️',
                mapId: 'default',
                description: '집합과 하나의 이항 연산이 결합 법칙/항등원/역원을 만족하는 대수적 구조.',
                metaTags: ['Philosophy: Symmetry', 'Philosophy: Structure'],
                crisis: '갈루아가 5차 방정식의 근의 공식이 존재하지 않음을 군론으로 증명했을 때, "풀 수 없음을 증명한다"는 발상 자체가 수학사의 패러다임을 바꿨다.'
            })

            // ========= 동치 관계 =========
            CREATE (equiv:Concept {
                id: 'equiv', label: '동치 관계(Equivalence Relation)', masteryLevel: 'UNSEEN', emotion: '⚖️',
                mapId: 'default',
                description: '반사·대칭·추이율을 모두 만족하는 관계. 집합을 동치류로 분할한다.',
                metaTags: ['Philosophy: Classification', 'Philosophy: Symmetry'],
                crisis: '"같다"는 것을 수학적으로 정확히 정의해야 했던 필요성. 기하학에서 합동과 닮음이 뒤섞이던 혼란을 종식했다.'
            })

            // ========= 위상(Topology) =========
            CREATE (topo:Concept {
                id: 'topo', label: '위상공간(Topological Space)', masteryLevel: 'UNSEEN', emotion: '🍩',
                mapId: 'default',
                description: '거리 없이 "가까움"만으로 연속성을 정의하는 초추상적 공간 구조.',
                metaTags: ['Philosophy: Local-to-Global', 'Philosophy: Approximation'],
                crisis: '도넛과 커피잔이 "위상적으로 같다"는 발상은 직관을 완전히 파괴했다. 거리 없이도 공간을 논할 수 있다는 것 자체가 20세기 수학의 혁명이었다.'
            })

            // ========= 관계 설정 =========
            CREATE (c1)-[:COMMUNICATE {weight: 1.0}]->(c2)
            CREATE (c2)-[:COMMUNICATE {weight: 1.0}]->(limit)
            CREATE (limit)-[:ACCESSIBLE {cost: 3.0}]->(c3)
            CREATE (c1)-[:ACCESSIBLE {cost: 4.0}]->(group)
            CREATE (c1)-[:COMMUNICATE {weight: 0.8}]->(equiv)
            CREATE (equiv)-[:ACCESSIBLE {cost: 5.0}]->(topo)
            CREATE (c3)-[:ACCESSIBLE {cost: 4.0}]->(topo)
            CREATE (c4)-[:INFLUENCES]->(c1)
            CREATE (c4)-[:INFLUENCES]->(group)
            CREATE (c4)-[:INFLUENCES]->(equiv)
        `);

        console.log('✅ Database Seeding Completed! 8 concepts with rich metaTags added.');
    } catch (error) {
        console.error('Error seeding database:', error);
    } finally {
        await session.close();
        process.exit(0);
    }
};

seedData();
