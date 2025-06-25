import { StateGraph, END } from "@langchain/langgraph";
import BaseAgent from './base/BaseAgent.js';
import DatabaseService from '../config/database.js';

export class QualityAssuranceAgent extends BaseAgent {
  constructor() {
    super('Quality Assurance', 'Ensure product quality, manage certifications, and handle quality control');
  }

  createWorkflow() {
    const workflow = new StateGraph({
      channels: {
        messages: [],
        context: {},
        action: null,
        result: null
      }
    });

    workflow.addNode("analyze_request", this.analyzeRequestNode.bind(this));
    workflow.addNode("verify_certification", this.verifyCertificationNode.bind(this));
    workflow.addNode("quality_inspection", this.qualityInspectionNode.bind(this));
    workflow.addNode("manage_standards", this.manageStandardsNode.bind(this));
    workflow.addNode("handle_quality_issues", this.handleQualityIssuesNode.bind(this));

    workflow.addEdge("__start__", "analyze_request");
    
    workflow.addConditionalEdges(
      "analyze_request",
      this.routeAction.bind(this),
      {
        "verify_certification": "verify_certification",
        "quality_inspection": "quality_inspection",
        "manage_standards": "manage_standards",
        "handle_quality_issues": "handle_quality_issues"
      }
    );

    workflow.addEdge("verify_certification", END);
    workflow.addEdge("quality_inspection", END);
    workflow.addEdge("manage_standards", END);
    workflow.addEdge("handle_quality_issues", END);

    return workflow.compile();
  }

  async analyzeRequestNode(state) {
    const { messages } = state;
    const lastMessage = messages[messages.length - 1];
    
    const llm = this.selectOptimalLLM('classification');
    
    const analysisPrompt = `
Analyze this quality assurance request and determine the action needed:

Available actions:
- verify_certification: Check and validate quality certifications
- quality_inspection: Conduct or review quality inspections
- manage_standards: Handle quality standards and requirements
- handle_quality_issues: Address quality complaints and issues

User message: "${lastMessage.content}"

Respond with only the action name.
`;

    try {
      const response = await llm.invoke([{ role: 'user', content: analysisPrompt }]);
      const action = response.content.trim().toLowerCase();
      
      return {
        ...state,
        action: action
      };
    } catch (error) {
      console.error('Request analysis error:', error);
      return {
        ...state,
        action: 'verify_certification' // Default action
      };
    }
  }

  routeAction(state) {
    return state.action || 'verify_certification';
  }

  async verifyCertificationNode(state) {
    const { messages } = state;
    const lastMessage = messages[messages.length - 1];
    
    try {
      const llm = this.selectOptimalLLM('generation');
      
      const extractionPrompt = `
Extract certification information to verify:

Message: "${lastMessage.content}"

Extract product ID, certification type, or certificate number. 
Format as JSON:
{
  "product_id": "product ID if mentioned",
  "certification_type": "type of certification",
  "certificate_number": "certificate number if provided"
}
`;

      const response = await llm.invoke([{ role: 'user', content: extractionPrompt }]);
      const certData = JSON.parse(response.content);
      
      let certifications = [];
      
      if (certData.product_id) {
        // Get certifications for specific product
        const { data, error } = await DatabaseService.client
          .from('quality_certifications')
          .select(`
            *,
            product:products(name, category, producer:profiles(full_name, company_name))
          `)
          .eq('product_id', certData.product_id);
        
        if (error) throw error;
        certifications = data || [];
      } else if (certData.certificate_number) {
        // Search by certificate number
        const { data, error } = await DatabaseService.client
          .from('quality_certifications')
          .select(`
            *,
            product:products(name, category, producer:profiles(full_name, company_name))
          `)
          .eq('certificate_number', certData.certificate_number);
        
        if (error) throw error;
        certifications = data || [];
      } else if (certData.certification_type) {
        // Search by certification type
        const { data, error } = await DatabaseService.client
          .from('quality_certifications')
          .select(`
            *,
            product:products(name, category, producer:profiles(full_name, company_name))
          `)
          .ilike('certification_type', `%${certData.certification_type}%`)
          .limit(10);
        
        if (error) throw error;
        certifications = data || [];
      }

      if (certifications.length === 0) {
        return {
          ...state,
          result: {
            content: "No certifications found matching your criteria. Please provide a product ID, certificate number, or certification type.",
            success: false
          }
        };
      }

      const certificationsList = certifications.map(cert => {
        const status = this.getCertificationStatus(cert);
        const statusEmoji = this.getStatusEmoji(status);
        
        return `${statusEmoji} **${cert.certification_type}**\n` +
               `   • Product: ${cert.product.name}\n` +
               `   • Producer: ${cert.product.producer.company_name || cert.product.producer.full_name}\n` +
               `   • Certificate #: ${cert.certificate_number || 'N/A'}\n` +
               `   • Issued by: ${cert.certification_body}\n` +
               `   • Issue Date: ${new Date(cert.issue_date).toLocaleDateString()}\n` +
               `   • Expiry Date: ${cert.expiry_date ? new Date(cert.expiry_date).toLocaleDateString() : 'No expiry'}\n` +
               `   • Status: ${status}\n` +
               `   • Verification: ${cert.verification_status}`;
      }).join('\n\n');

      const verificationText = `🏆 **Certification Verification Results**\n\n` +
                              `**Found ${certifications.length} certification(s):**\n\n` +
                              certificationsList +
                              `\n\n**Verification Summary:**\n` +
                              `• Valid Certifications: ${certifications.filter(c => this.getCertificationStatus(c) === 'Valid').length}\n` +
                              `• Expired Certifications: ${certifications.filter(c => this.getCertificationStatus(c) === 'Expired').length}\n` +
                              `• Pending Verification: ${certifications.filter(c => c.verification_status === 'pending').length}`;

      return {
        ...state,
        result: {
          content: verificationText,
          success: true,
          certifications: certifications
        }
      };
    } catch (error) {
      console.error('Certification verification error:', error);
      return {
        ...state,
        result: {
          content: "I couldn't verify the certification. Please provide valid certification details.",
          success: false
        }
      };
    }
  }

  getCertificationStatus(cert) {
    if (cert.verification_status === 'revoked') return 'Revoked';
    if (cert.verification_status === 'expired') return 'Expired';
    
    if (cert.expiry_date) {
      const expiryDate = new Date(cert.expiry_date);
      const now = new Date();
      
      if (expiryDate < now) return 'Expired';
      
      // Check if expiring soon (within 30 days)
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
      
      if (expiryDate < thirtyDaysFromNow) return 'Expiring Soon';
    }
    
    return cert.verification_status === 'verified' ? 'Valid' : 'Pending Verification';
  }

  getStatusEmoji(status) {
    const statusEmojis = {
      'Valid': '✅',
      'Expired': '❌',
      'Expiring Soon': '⚠️',
      'Revoked': '🚫',
      'Pending Verification': '⏳'
    };
    return statusEmojis[status] || '📋';
  }

  async qualityInspectionNode(state) {
    const { messages, context } = state;
    const lastMessage = messages[messages.length - 1];
    
    try {
      const llm = this.selectOptimalLLM('generation');
      
      const extractionPrompt = `
Extract quality inspection request:

Message: "${lastMessage.content}"

Extract product information and quality concerns.
Format as JSON:
{
  "product_id": "product ID if mentioned",
  "quality_concerns": "specific quality issues or concerns",
  "inspection_type": "type of inspection needed",
  "urgency": "low/medium/high"
}
`;

      const response = await llm.invoke([{ role: 'user', content: extractionPrompt }]);
      const inspectionData = JSON.parse(response.content);
      
      if (!inspectionData.product_id && !inspectionData.quality_concerns) {
        return {
          ...state,
          result: {
            content: "Please specify which product needs inspection or describe the quality concerns.",
            success: false
          }
        };
      }

      // Generate inspection checklist based on product type
      let product = null;
      if (inspectionData.product_id) {
        product = await DatabaseService.getProduct(inspectionData.product_id);
      }

      const inspectionChecklist = this.generateInspectionChecklist(
        product?.category || 'General',
        inspectionData.quality_concerns
      );

      const inspectionPlan = this.createInspectionPlan(
        inspectionData.urgency || 'medium',
        inspectionData.inspection_type
      );

      const inspectionText = `🔍 **Quality Inspection Plan**\n\n` +
                            `**Product Information:**\n` +
                            `${product ? `• Product: ${product.name}\n• Category: ${product.category}\n• Producer: ${product.producer.full_name}\n` : '• General inspection requested\n'}` +
                            `• Urgency Level: ${inspectionData.urgency || 'Medium'}\n` +
                            `• Inspection Type: ${inspectionData.inspection_type || 'Standard'}\n\n` +
                            `**Quality Concerns:**\n` +
                            `${inspectionData.quality_concerns || 'General quality verification'}\n\n` +
                            `**Inspection Checklist:**\n` +
                            inspectionChecklist.map(item => `• ${item}`).join('\n') +
                            `\n\n**Inspection Timeline:**\n` +
                            inspectionPlan.timeline.map(step => `• ${step}`).join('\n') +
                            `\n\n**Required Documentation:**\n` +
                            inspectionPlan.documentation.map(doc => `• ${doc}`).join('\n') +
                            `\n\n**Next Steps:**\n` +
                            `1. Schedule inspection appointment\n` +
                            `2. Prepare required documentation\n` +
                            `3. Conduct on-site or remote inspection\n` +
                            `4. Generate quality report\n` +
                            `5. Issue certification if standards are met`;

      return {
        ...state,
        result: {
          content: inspectionText,
          success: true,
          inspection: {
            checklist: inspectionChecklist,
            plan: inspectionPlan,
            product: product
          }
        }
      };
    } catch (error) {
      console.error('Quality inspection error:', error);
      return {
        ...state,
        result: {
          content: "I couldn't create an inspection plan. Please provide more details about the quality concerns.",
          success: false
        }
      };
    }
  }

  generateInspectionChecklist(category, concerns) {
    const baseChecklist = [
      'Visual appearance and condition',
      'Packaging integrity and labeling',
      'Documentation completeness',
      'Storage and handling conditions'
    ];

    const categoryChecklists = {
      'Fruits': [
        'Ripeness and maturity level',
        'Skin condition and blemishes',
        'Size and weight consistency',
        'Sugar content (Brix level)',
        'Pesticide residue testing'
      ],
      'Vegetables': [
        'Freshness and crispness',
        'Color uniformity',
        'Absence of decay or damage',
        'Nutritional content verification',
        'Organic certification compliance'
      ],
      'Grains': [
        'Moisture content measurement',
        'Foreign matter detection',
        'Grain size and uniformity',
        'Protein content analysis',
        'Mycotoxin testing'
      ],
      'Dairy': [
        'Temperature control verification',
        'Bacterial count testing',
        'Fat content analysis',
        'Expiration date validation',
        'Pasteurization verification'
      ]
    };

    let checklist = [...baseChecklist];
    
    if (categoryChecklists[category]) {
      checklist = checklist.concat(categoryChecklists[category]);
    }

    // Add specific items based on concerns
    if (concerns) {
      const concernsLower = concerns.toLowerCase();
      if (concernsLower.includes('organic')) {
        checklist.push('Organic certification verification');
      }
      if (concernsLower.includes('contamination')) {
        checklist.push('Contamination testing and analysis');
      }
      if (concernsLower.includes('freshness')) {
        checklist.push('Freshness indicators and shelf life assessment');
      }
    }

    return checklist;
  }

  createInspectionPlan(urgency, inspectionType) {
    const urgencyTimelines = {
      'high': {
        timeline: [
          'Immediate: Schedule within 24 hours',
          'Day 1: Conduct preliminary assessment',
          'Day 2: Complete detailed inspection',
          'Day 3: Generate and deliver report'
        ],
        documentation: [
          'Emergency inspection request form',
          'Product samples for testing',
          'Chain of custody documentation',
          'Expedited lab analysis results'
        ]
      },
      'medium': {
        timeline: [
          'Week 1: Schedule inspection appointment',
          'Week 2: Conduct on-site inspection',
          'Week 3: Laboratory testing and analysis',
          'Week 4: Final report and certification'
        ],
        documentation: [
          'Standard inspection request form',
          'Product specifications and standards',
          'Previous inspection reports',
          'Certification requirements checklist'
        ]
      },
      'low': {
        timeline: [
          'Month 1: Initial assessment and planning',
          'Month 2: Detailed inspection and testing',
          'Month 3: Analysis and report preparation',
          'Month 4: Final certification and documentation'
        ],
        documentation: [
          'Comprehensive inspection request',
          'Historical quality data',
          'Regulatory compliance documentation',
          'Long-term quality improvement plan'
        ]
      }
    };

    return urgencyTimelines[urgency] || urgencyTimelines['medium'];
  }

  async manageStandardsNode(state) {
    try {
      // Get quality standards information
      const qualityStandards = this.getQualityStandards();
      
      const standardsText = `📋 **Quality Standards Management**\n\n` +
                           `**Available Quality Standards:**\n\n` +
                           qualityStandards.map(standard => 
                             `**${standard.name}**\n` +
                             `• Category: ${standard.category}\n` +
                             `• Requirements: ${standard.requirements.join(', ')}\n` +
                             `• Certification Body: ${standard.certificationBody}\n` +
                             `• Validity Period: ${standard.validityPeriod}\n` +
                             `• Cost: ${standard.cost}\n`
                           ).join('\n') +
                           `\n**Compliance Guidelines:**\n` +
                           `• Maintain proper documentation for all quality processes\n` +
                           `• Schedule regular inspections and renewals\n` +
                           `• Keep up-to-date with changing regulations\n` +
                           `• Implement continuous quality improvement practices\n\n` +
                           `**To apply for certification, provide:**\n`+
                           `• Product details and specifications\n` +
                           `• Production process documentation\n` +
                           `• Quality control procedures\n` +
                           `• Previous certification history`;

      return {
        ...state,
        result: {
          content: standardsText,
          success: true,
          standards: qualityStandards
        }
      };
    } catch (error) {
      console.error('Standards management error:', error);
      return {
        ...state,
        result: {
          content: "I couldn't retrieve quality standards information. Please try again.",
          success: false
        }
      };
    }
  }

  getQualityStandards() {
    return [
      {
        name: 'USDA Organic',
        category: 'Organic Certification',
        requirements: ['No synthetic pesticides', 'No GMOs', 'Organic farming practices'],
        certificationBody: 'USDA',
        validityPeriod: '1 year',
        cost: '$500-2000'
      },
      {
        name: 'GlobalGAP',
        category: 'Good Agricultural Practices',
        requirements: ['Food safety', 'Environmental protection', 'Worker welfare'],
        certificationBody: 'GlobalGAP',
        validityPeriod: '3 years',
        cost: '$1000-5000'
      },
      {
        name: 'Fair Trade',
        category: 'Ethical Trading',
        requirements: ['Fair wages', 'Safe working conditions', 'Community development'],
        certificationBody: 'Fair Trade USA',
        validityPeriod: '3 years',
        cost: '$2000-10000'
      },
      {
        name: 'ISO 22000',
        category: 'Food Safety Management',
        requirements: ['HACCP principles', 'Food safety management system', 'Continuous improvement'],
        certificationBody: 'ISO',
        validityPeriod: '3 years',
        cost: '$3000-15000'
      },
      {
        name: 'Rainforest Alliance',
        category: 'Sustainable Agriculture',
        requirements: ['Environmental conservation', 'Wildlife protection', 'Worker rights'],
        certificationBody: 'Rainforest Alliance',
        validityPeriod: '3 years',
        cost: '$1500-8000'
      }
    ];
  }

  async handleQualityIssuesNode(state) {
    const { messages, context } = state;
    const lastMessage = messages[messages.length - 1];
    
    try {
      const llm = this.selectOptimalLLM('generation');
      
      const extractionPrompt = `
Extract quality issue information:

Message: "${lastMessage.content}"

Extract details about the quality problem.
Format as JSON:
{
  "issue_type": "type of quality issue",
  "product_id": "product ID if mentioned",
  "severity": "low/medium/high/critical",
  "description": "detailed description of the issue",
  "affected_quantity": "amount affected if known"
}
`;

      const response = await llm.invoke([{ role: 'user', content: extractionPrompt }]);
      const issueData = JSON.parse(response.content);
      
      // Create quality issue resolution plan
      const resolutionPlan = this.createResolutionPlan(issueData);
      
      // Generate issue tracking ID
      const issueId = `QI-${Date.now().toString().slice(-6)}`;
      
      const issueText = `🚨 **Quality Issue Management**\n\n` +
                       `**Issue ID:** ${issueId}\n` +
                       `**Issue Type:** ${issueData.issue_type || 'General Quality Concern'}\n` +
                       `**Severity Level:** ${issueData.severity || 'Medium'}\n` +
                       `**Description:** ${issueData.description || 'Quality issue reported'}\n` +
                       `${issueData.affected_quantity ? `**Affected Quantity:** ${issueData.affected_quantity}\n` : ''}` +
                       `**Status:** Under Investigation\n\n` +
                       `**Immediate Actions:**\n` +
                       resolutionPlan.immediateActions.map(action => `• ${action}`).join('\n') +
                       `\n\n**Investigation Plan:**\n` +
                       resolutionPlan.investigationSteps.map(step => `• ${step}`).join('\n') +
                       `\n\n**Resolution Timeline:**\n` +
                       resolutionPlan.timeline.map(milestone => `• ${milestone}`).join('\n') +
                       `\n\n**Preventive Measures:**\n` +
                       resolutionPlan.preventiveMeasures.map(measure => `• ${measure}`).join('\n') +
                       `\n\n**Next Steps:**\n` +
                       `1. Document all evidence and samples\n` +
                       `2. Notify relevant stakeholders\n` +
                       `3. Begin investigation process\n` +
                       `4. Implement corrective actions\n` +
                       `5. Monitor for resolution effectiveness`;

      // In a real system, this would create a record in the database
      console.log(`Quality issue ${issueId} created:`, issueData);

      return {
        ...state,
        result: {
          content: issueText,
          success: true,
          issue: {
            id: issueId,
            ...issueData,
            resolutionPlan: resolutionPlan
          }
        }
      };
    } catch (error) {
      console.error('Quality issue handling error:', error);
      return {
        ...state,
        result: {
          content: "I couldn't process the quality issue. Please provide more details about the problem.",
          success: false
        }
      };
    }
  }

  createResolutionPlan(issueData) {
    const severity = issueData.severity || 'medium';
    
    const basePlan = {
      immediateActions: [
        'Isolate affected products',
        'Document issue with photos/samples',
        'Notify quality assurance team'
      ],
      investigationSteps: [
        'Collect product samples for testing',
        'Review production records',
        'Interview relevant personnel',
        'Analyze root cause'
      ],
      timeline: [
        'Day 1: Issue identification and isolation',
        'Day 2-3: Investigation and testing',
        'Day 4-5: Root cause analysis',
        'Day 6-7: Corrective action implementation'
      ],
      preventiveMeasures: [
        'Review and update quality procedures',
        'Enhance monitoring protocols',
        'Provide additional staff training',
        'Implement regular quality audits'
      ]
    };

    // Adjust plan based on severity
    if (severity === 'critical' || severity === 'high') {
      basePlan.immediateActions.unshift('URGENT: Stop all related production');
      basePlan.immediateActions.push('Notify regulatory authorities if required');
      basePlan.timeline = [
        'Hour 1: Immediate containment',
        'Hour 2-4: Emergency investigation',
        'Day 1: Preliminary findings',
        'Day 2: Corrective actions implemented'
      ];
    }

    // Add specific actions based on issue type
    const issueType = (issueData.issue_type || '').toLowerCase();
    if (issueType.includes('contamination')) {
      basePlan.immediateActions.push('Conduct contamination testing');
      basePlan.investigationSteps.push('Trace contamination source');
    }
    
    if (issueType.includes('packaging')) {
      basePlan.investigationSteps.push('Review packaging procedures');
      basePlan.preventiveMeasures.push('Upgrade packaging quality controls');
    }

    return basePlan;
  }

  getSystemPrompt() {
    return `You are the Quality Assurance Agent in AgriConnect, specialized in ensuring product quality and safety standards.

Your capabilities:
1. Verify and validate quality certifications
2. Conduct quality inspections and assessments
3. Manage quality standards and compliance requirements
4. Handle quality issues and complaints
5. Provide quality improvement recommendations
6. Coordinate with certification bodies and testing facilities

Always prioritize food safety and quality standards while helping users maintain compliance with regulations.
Be thorough in quality assessments and provide clear guidance on improvement opportunities.`;
  }
}

export default QualityAssuranceAgent;