import { GoogleGenerativeAI } from '@google/generative-ai';

export interface IssueAnalysisInput {
  imageUrl?: string;
  imageBase64?: string;
  mimeType?: string;
  description?: string;
  ward?: string;
  landmark?: string;
}

export interface IssueAnalysisResult {
  category: string;
  department: string;
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  priorityScore: number;
  severityScore: number;
  isEquityBoosted: boolean;
  equityMultiplier: number;
  summary: string;
  actionItems: string[];
  detectedHazards: string[];
}

/**
 * Analyzes civic complaint images and text using Gemini 1.5 Flash.
 * Applies Equity Boost for underserved wards (Ward 9 and Ward 11).
 * 
 * Includes defensive JSON sanitization to handle raw markdown fences from LLM responses
 * and safe string lowercasing/trimming to prevent undefined reference crashes.
 */
export async function analyzeIssue(input: IssueAnalysisInput): Promise<IssueAnalysisResult> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '';
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

  const { imageUrl, imageBase64, mimeType = 'image/jpeg', description = '', ward, landmark = '' } = input;

  // Safe lowercasing and trimming for Ward 9 and Ward 11 Equity Boost
  const isUnderservedWard = Boolean(
    ward?.toLowerCase().includes('ward 9') || 
    ward?.toLowerCase().includes('ward 11')
  );

  const prompt = `
You are CivicFlow's AI Municipal Triage Engine. Analyze this reported civic issue.
Ward: ${ward || 'Unknown'}
Landmark: ${landmark || 'Not specified'}
User Description: ${description || 'None provided'}

Return a valid JSON object strictly adhering to this structure:
{
  "category": "Road" | "Sanitation" | "Water Supply" | "Electricity" | "Drainage" | "Public Safety" | "Other",
  "department": "Infrastructure" | "Sanitation" | "Water Supply" | "Electrical" | "Disaster Management",
  "priority": "Low" | "Medium" | "High" | "Critical",
  "severityScore": <integer 1 to 100>,
  "summary": "<one sentence concise summary of the problem>",
  "actionItems": ["<action item 1>", "<action item 2>"],
  "detectedHazards": ["<hazard 1>", "<hazard 2>"]
}
`;

  const contents: any[] = [{ text: prompt }];

  if (imageBase64) {
    contents.push({
      inlineData: {
        data: imageBase64.replace(/^data:image\/\w+;base64,/, ''),
        mimeType
      }
    });
  }

  let rawText = '';
  try {
    const response = await model.generateContent(contents);
    rawText = response.response.text();
  } catch (err: any) {
    console.warn('[analyzeIssue] Gemini generation failed or fallback triggered:', err.message);
    // Graceful fallback heuristics
    rawText = JSON.stringify({
      category: description.toLowerCase().includes('water') ? 'Water Supply' : 'Infrastructure',
      department: description.toLowerCase().includes('water') ? 'Water Supply' : 'Infrastructure',
      priority: description.toLowerCase().includes('urgent') || description.toLowerCase().includes('danger') ? 'Critical' : 'High',
      severityScore: isUnderservedWard ? 85 : 70,
      summary: description || 'Civic grievance reported for inspection.',
      actionItems: ['Dispatch field inspection team', 'Verify site conditions'],
      detectedHazards: ['Traffic bottleneck / pedestrian obstruction']
    });
  }

  // Defensive JSON sanitization: Strip markdown codeblocks (```json ... ``` or ``` ... ```)
  const sanitizedText = rawText
    .replace(/```json/gi, '')
    .replace(/```/g, '')
    .trim();

  let parsed: any = {};
  try {
    parsed = JSON.parse(sanitizedText);
  } catch (err) {
    console.error('[analyzeIssue] JSON parse error after sanitization. Raw:', rawText);
    parsed = {
      category: 'Infrastructure',
      department: 'Infrastructure',
      priority: 'Medium',
      severityScore: 50,
      summary: description || 'Issue logged in municipal system',
      actionItems: ['Assign officer for site assessment'],
      detectedHazards: []
    };
  }

  // Calculate final priority score with Equity Boost
  let baseScore = Number(parsed.severityScore) || 50;
  let equityMultiplier = 1.0;

  if (isUnderservedWard) {
    equityMultiplier = 1.25; // 25% priority boost for historically underserved wards
    baseScore = Math.min(100, Math.round(baseScore * equityMultiplier));
  }

  // Determine final priority label
  let finalPriority: 'Low' | 'Medium' | 'High' | 'Critical' = parsed.priority || 'Medium';
  if (baseScore >= 85) {
    finalPriority = 'Critical';
  } else if (baseScore >= 65) {
    finalPriority = 'High';
  } else if (baseScore >= 40) {
    finalPriority = 'Medium';
  } else {
    finalPriority = 'Low';
  }

  return {
    category: parsed.category || 'Infrastructure',
    department: parsed.department || 'Infrastructure',
    priority: finalPriority,
    priorityScore: baseScore,
    severityScore: Number(parsed.severityScore) || baseScore,
    isEquityBoosted: isUnderservedWard,
    equityMultiplier: isUnderservedWard ? 1.25 : 1.0,
    summary: parsed.summary || 'Civic complaint recorded',
    actionItems: Array.isArray(parsed.actionItems) ? parsed.actionItems : ['Inspect location'],
    detectedHazards: Array.isArray(parsed.detectedHazards) ? parsed.detectedHazards : []
  };
}
