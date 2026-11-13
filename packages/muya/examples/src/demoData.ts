export interface DemoFileItem {
    id: string;
    name: string;
    type: 'folder' | 'file';
    parentId: string | null;
    content?: string;
    expanded?: boolean;
}

export const INITIAL_FILE_SYSTEM: DemoFileItem[] = [
    // Pastas Principais
    {
        id: 'folder-prontuarios',
        name: 'Prontuários',
        type: 'folder',
        parentId: null,
        expanded: true,
    },
    {
        id: 'folder-cardio',
        name: '01_Cardiologia',
        type: 'folder',
        parentId: 'folder-prontuarios',
        expanded: true,
    },
    {
        id: 'folder-orto',
        name: '02_Ortopedia',
        type: 'folder',
        parentId: 'folder-prontuarios',
        expanded: false,
    },
    {
        id: 'folder-pediatria',
        name: '03_Pediatria',
        type: 'folder',
        parentId: 'folder-prontuarios',
        expanded: false,
    },

    // Arquivos em Cardiologia
    {
        id: 'file-anamnese-cardio',
        name: '01_Anamnese_Geral_Cardio.md',
        type: 'file',
        parentId: 'folder-cardio',
        content: `# Maria Clara de Souza - 42 anos

**Data/Hora:** 2026-11-13 10:30  
**Leito / Local:** Enfermaria 04 - Leito B  
**Médico Responsável:** Dr. Plantonista

---

## 1. Identificação e Queixa Principal
Paciente feminina, 42 anos, internada há 2 dias para investigação de dor precordial atípica e palpitações aos esforços.

## 2. História da Doença Atual (HDA)
Refere melhora expressiva após otimização medicamentosa. Nega novos episódios de dispneia paroxística noturna ou ortopneia. Diurese preservada espontaneamente.

> **Alerta Clínico:** Alergia prévia a Dipirona e contraste iodado.

## 3. Sinais Vitais e Exame Físico
| Parâmetro | Valor | Referência |
| :--- | :--- | :--- |
| **Pressão Arterial (PA)** | 120/75 mmHg | Normal |
| **Frequência Cardíaca (FC)** | 72 bpm | Normocárdica |
| **Saturação O2 (SpO2)** | 98% em ar ambiente | Normal |
| **Temperatura Axilar** | 36,4 °C | Afebril |

- **Geral:** BEG, lúcida e orientada no tempo e espaço (LOTE), corada, hidratada, anictérica.
- **Cardiovascular:** RCR em 2 tempos, bulhas normofonéticas, sem sopros audíveis.
- **Respiratório:** Murmúrio vesicular presente bilateralmente, sem ruídos adventícios.
- **Extremidades:** Pulsos periféricos amplos e simétricos, sem edema de MMII.

## 4. Pendências do Plantão (Checklist)
- [x] Eletrocardiograma (ECG) de 12 derivações revisado
- [x] Curva enzimática (Troponina I) seriada negativa
- [ ] Checar resultado de Ecocardiograma Transtorácico
- [ ] Reavaliação de alta ambulatorial no final do dia

## 5. Conduta e Prescrição
1. Dieta hipossódica para cardiopata.
2. Losartana Potássica 50mg VO pela manhã.
3. Bisoprolol 2.5mg VO pela manhã.
4. Sintomáticos se necessário (Paracetamol 500mg VO até de 6/6h se dor ou febre).
`,
    },
    {
        id: 'file-insuficiencia-cardiaca',
        name: '02_Insuficiencia_Cardiaca.md',
        type: 'file',
        parentId: 'folder-cardio',
        content: `# João Batista Pereira - 68 anos

**Data/Hora:** 2026-11-13 11:00  
**Diagnóstico:** Insuficiência Cardíaca Descompensada (Perfil B)  
**Leito:** UTI 02

---

## Evolução Clínica
Paciente em D3 de compensação de IC feropênica. Refere melhora importante da dispneia em repouso e ortopneia.

- **Balanço Hídrico 24h:** Negativo em -1.200 ml.
- **Ausculta Pulmonar:** Estertores crepitantes discretos em bases pulmonares (em regressão).
- **Membros Inferiores:** Edema 1+/4+ com cacifo presente pré-tibial.

## Conduta
1. Manter Furosemida 20mg EV de 8/8h.
2. Iniciar transição para espironolactona VO conforme função renal.
3. Controle estrito de peso diário em jejum.
`,
    },

    // Arquivos em Ortopedia
    {
        id: 'file-fratura-radio',
        name: 'Fratura_Radio_Distal.md',
        type: 'file',
        parentId: 'folder-orto',
        content: `# Carlos Eduardo Ramos - 29 anos

**Data/Hora:** 2026-11-13 09:15  
**Atendimento:** Pronto-Socorro / Ortopedia  
**Mecanismo do Trauma:** Queda de própria altura com apoio na mão espalmada.

---

## Exame Físico
- Edema e deformidade em "dorso de garfo" no punho direito.
- Dor intensa à palpação do rádio distal.
- Pulsos radial e ulnar preservados.
- Perfusão capilar periférica < 2 segundos. Sem déficit neurossensorial.

## Raio-X de Punho D (AP + Perfil)
Fratura da metáfise distal do rádio, traço extra-articular com desvio dorsal mínimo.

## Conduta
1. Redução incruenta sob anestesia local (hematoma block).
2. Imobilização com tala gessada axilopalmar.
3. Raio-X de controle pós-imobilização satisfatório.
4. Analgesia oral (Paracetamol + Codeína se dor intensa).
5. Encaminhamento para retorno ambulatorial em 7 dias para novo controle radiológico.
`,
    },

    // Arquivos em Pediatria
    {
        id: 'file-bronquiolite',
        name: 'Bronquiolite_Viral_Aguda.md',
        type: 'file',
        parentId: 'folder-pediatria',
        content: `# Lucas Silva Santos - 8 meses

**Data/Hora:** 2026-11-13 10:00  
**Acompanhante:** Mãe  
**Queixa:** Tosse, coriza e cansaço respiratório há 3 dias.

---

## Exame Clínico
- BEG, reativo, afebril no momento.
- Taquipneico leve (FR 46 irpm), sem tiragem subcostal importante.
- SpO2: 96% em ar ambiente.
- Ausculta: Tempo expiratório prolongado com sibilos esparsos bilaterais.

## Conduta
1. Lavagem nasal com Soro Fisiológico 0.9% frequente antes das mamadas.
2. Hidratação oral fracionada incentivada.
3. Não há indicação de broncodilatador ou corticoide sistêmico no momento.
4. Orientações claras de sinais de alerta (tiragem, batimento de asa de nariz, recusa alimentar).
5. Retorno imediato ao pronto atendimento se piora respiratória.
`,
    },
];
