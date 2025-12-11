/**
 * Integration Test Runner
 * 
 * Comprehensive test suite runner that validates all requirements
 * and provides detailed reporting for the final integration testing.
 */

import { execSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

interface TestResult {
  suite: string;
  passed: number;
  failed: number;
  skipped: number;
  duration: number;
  errors: string[];
}

interface RequirementValidation {
  requirement: string;
  description: string;
  testSuites: string[];
  status: 'passed' | 'failed' | 'partial';
  details: string[];
}

class IntegrationTestRunner {
  private results: TestResult[] = [];
  private requirements: RequirementValidation[] = [
    {
      requirement: '1.1-1.5',
      description: 'User Registration',
      testSuites: ['e2e-integration.test.tsx'],
      status: 'failed',
      details: [],
    },
    {
      requirement: '2.1-2.5',
      description: 'User Authentication',
      testSuites: ['e2e-integration.test.tsx', 'auth-service.test.ts'],
      status: 'failed',
      details: [],
    },
    {
      requirement: '3.1-3.5',
      description: 'Session Management',
      testSuites: ['e2e-integration.test.tsx', 'session-management.test.ts'],
      status: 'failed',
      details: [],
    },
    {
      requirement: '4.1-4.5',
      description: 'Data Security and Management',
      testSuites: ['e2e-integration.test.tsx'],
      status: 'failed',
      details: [],
    },
    {
      requirement: '5.1-5.5',
      description: 'Configuration Management',
      testSuites: ['config-validation.test.ts', 'e2e-integration.test.tsx'],
      status: 'failed',
      details: [],
    },
    {
      requirement: '6.1-6.5',
      description: 'Real-time Features',
      testSuites: ['realtime-features.test.tsx'],
      status: 'failed',
      details: [],
    },
  ];

  async runAllTests(): Promise<void> {
    console.log('🚀 Starting comprehensive integration testing...\n');

    try {
      // Run all test suites
      await this.runTestSuite('Unit Tests', 'src/test/*.test.ts');
      await this.runTestSuite('Integration Tests', 'src/test/*integration*.test.tsx');
      await this.runTestSuite('Real-time Tests', 'src/test/realtime-features.test.tsx');
      await this.runTestSuite('Error Handling Tests', 'src/test/auth-error-scenarios.test.ts');
      await this.runTestSuite('Loading States Tests', 'src/test/loading-states*.test.tsx');

      // Validate requirements
      this.validateRequirements();

      // Generate report
      this.generateReport();

      console.log('\n✅ Integration testing completed successfully!');
    } catch (error) {
      console.error('\n❌ Integration testing failed:', error);
      process.exit(1);
    }
  }

  private async runTestSuite(name: string, pattern: string): Promise<void> {
    console.log(`📋 Running ${name}...`);
    
    try {
      const startTime = Date.now();
      
      // Run vitest with specific pattern
      const output = execSync(
        `npx vitest run ${pattern} --reporter=json --run`,
        { 
          encoding: 'utf8',
          cwd: process.cwd(),
          timeout: 60000 // 60 second timeout
        }
      );

      const duration = Date.now() - startTime;
      
      // Parse test results
      const result = this.parseTestOutput(output, name, duration);
      this.results.push(result);

      if (result.failed > 0) {
        console.log(`  ⚠️  ${result.failed} tests failed in ${name}`);
        result.errors.forEach(error => console.log(`    - ${error}`));
      } else {
        console.log(`  ✅ All ${result.passed} tests passed in ${name}`);
      }
    } catch (error) {
      console.log(`  ❌ ${name} failed to run:`, error);
      this.results.push({
        suite: name,
        passed: 0,
        failed: 1,
        skipped: 0,
        duration: 0,
        errors: [error instanceof Error ? error.message : String(error)],
      });
    }
  }

  private parseTestOutput(output: string, suiteName: string, duration: number): TestResult {
    try {
      // Try to parse JSON output from vitest
      const lines = output.split('\n');
      const jsonLine = lines.find(line => line.trim().startsWith('{'));
      
      if (jsonLine) {
        const testResult = JSON.parse(jsonLine);
        return {
          suite: suiteName,
          passed: testResult.numPassedTests || 0,
          failed: testResult.numFailedTests || 0,
          skipped: testResult.numPendingTests || 0,
          duration,
          errors: testResult.testResults?.flatMap((result: any) => 
            result.assertionResults
              ?.filter((assertion: any) => assertion.status === 'failed')
              ?.map((assertion: any) => assertion.title)
          ) || [],
        };
      }
    } catch (error) {
      console.warn('Failed to parse test output as JSON, using fallback parsing');
    }

    // Fallback parsing for non-JSON output
    const passedMatch = output.match(/(\d+) passed/);
    const failedMatch = output.match(/(\d+) failed/);
    const skippedMatch = output.match(/(\d+) skipped/);

    return {
      suite: suiteName,
      passed: passedMatch ? parseInt(passedMatch[1]) : 0,
      failed: failedMatch ? parseInt(failedMatch[1]) : 0,
      skipped: skippedMatch ? parseInt(skippedMatch[1]) : 0,
      duration,
      errors: [],
    };
  }

  private validateRequirements(): void {
    console.log('\n📊 Validating requirements...');

    this.requirements.forEach(req => {
      const relevantResults = this.results.filter(result =>
        req.testSuites.some(suite => result.suite.includes(suite.replace('.tsx', '').replace('.ts', '')))
      );

      if (relevantResults.length === 0) {
        req.status = 'failed';
        req.details.push('No test results found for this requirement');
        return;
      }

      const totalPassed = relevantResults.reduce((sum, result) => sum + result.passed, 0);
      const totalFailed = relevantResults.reduce((sum, result) => sum + result.failed, 0);
      const totalTests = totalPassed + totalFailed;

      if (totalFailed === 0 && totalPassed > 0) {
        req.status = 'passed';
        req.details.push(`All ${totalPassed} tests passed`);
      } else if (totalPassed > 0 && totalFailed > 0) {
        req.status = 'partial';
        req.details.push(`${totalPassed}/${totalTests} tests passed`);
      } else {
        req.status = 'failed';
        req.details.push(`${totalFailed} tests failed, ${totalPassed} passed`);
      }

      // Add specific error details
      relevantResults.forEach(result => {
        if (result.errors.length > 0) {
          req.details.push(`Errors in ${result.suite}:`);
          result.errors.forEach(error => req.details.push(`  - ${error}`));
        }
      });

      const statusIcon = req.status === 'passed' ? '✅' : req.status === 'partial' ? '⚠️' : '❌';
      console.log(`  ${statusIcon} Requirement ${req.requirement}: ${req.description} - ${req.status.toUpperCase()}`);
    });
  }

  private generateReport(): void {
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalSuites: this.results.length,
        totalPassed: this.results.reduce((sum, r) => sum + r.passed, 0),
        totalFailed: this.results.reduce((sum, r) => sum + r.failed, 0),
        totalSkipped: this.results.reduce((sum, r) => sum + r.skipped, 0),
        totalDuration: this.results.reduce((sum, r) => sum + r.duration, 0),
      },
      results: this.results,
      requirements: this.requirements,
      recommendations: this.generateRecommendations(),
    };

    // Write detailed report
    const reportPath = join(process.cwd(), 'integration-test-report.json');
    writeFileSync(reportPath, JSON.stringify(report, null, 2));

    // Generate human-readable summary
    this.generateSummaryReport(report);

    console.log(`\n📄 Detailed report saved to: ${reportPath}`);
  }

  private generateSummaryReport(report: any): void {
    const summaryLines = [
      '# Integration Test Summary Report',
      '',
      `**Generated:** ${new Date(report.timestamp).toLocaleString()}`,
      '',
      '## Overall Results',
      '',
      `- **Total Test Suites:** ${report.summary.totalSuites}`,
      `- **Tests Passed:** ${report.summary.totalPassed}`,
      `- **Tests Failed:** ${report.summary.totalFailed}`,
      `- **Tests Skipped:** ${report.summary.totalSkipped}`,
      `- **Total Duration:** ${(report.summary.totalDuration / 1000).toFixed(2)}s`,
      '',
      '## Requirements Validation',
      '',
    ];

    report.requirements.forEach((req: RequirementValidation) => {
      const statusIcon = req.status === 'passed' ? '✅' : req.status === 'partial' ? '⚠️' : '❌';
      summaryLines.push(`### ${statusIcon} Requirement ${req.requirement}: ${req.description}`);
      summaryLines.push('');
      summaryLines.push(`**Status:** ${req.status.toUpperCase()}`);
      summaryLines.push('');
      summaryLines.push('**Details:**');
      req.details.forEach(detail => summaryLines.push(`- ${detail}`));
      summaryLines.push('');
    });

    summaryLines.push('## Test Suite Results');
    summaryLines.push('');

    report.results.forEach((result: TestResult) => {
      const icon = result.failed === 0 ? '✅' : '❌';
      summaryLines.push(`### ${icon} ${result.suite}`);
      summaryLines.push('');
      summaryLines.push(`- Passed: ${result.passed}`);
      summaryLines.push(`- Failed: ${result.failed}`);
      summaryLines.push(`- Skipped: ${result.skipped}`);
      summaryLines.push(`- Duration: ${(result.duration / 1000).toFixed(2)}s`);
      
      if (result.errors.length > 0) {
        summaryLines.push('');
        summaryLines.push('**Errors:**');
        result.errors.forEach(error => summaryLines.push(`- ${error}`));
      }
      summaryLines.push('');
    });

    if (report.recommendations.length > 0) {
      summaryLines.push('## Recommendations');
      summaryLines.push('');
      report.recommendations.forEach((rec: string) => summaryLines.push(`- ${rec}`));
    }

    const summaryPath = join(process.cwd(), 'integration-test-summary.md');
    writeFileSync(summaryPath, summaryLines.join('\n'));
    console.log(`📄 Summary report saved to: ${summaryPath}`);
  }

  private generateRecommendations(): string[] {
    const recommendations: string[] = [];

    // Check for failed requirements
    const failedReqs = this.requirements.filter(req => req.status === 'failed');
    if (failedReqs.length > 0) {
      recommendations.push(`Address ${failedReqs.length} failed requirement(s) before deployment`);
    }

    // Check for partial requirements
    const partialReqs = this.requirements.filter(req => req.status === 'partial');
    if (partialReqs.length > 0) {
      recommendations.push(`Review ${partialReqs.length} partially passing requirement(s) for potential issues`);
    }

    // Check test coverage
    const totalTests = this.results.reduce((sum, r) => sum + r.passed + r.failed, 0);
    if (totalTests < 50) {
      recommendations.push('Consider adding more comprehensive test coverage');
    }

    // Check for skipped tests
    const totalSkipped = this.results.reduce((sum, r) => sum + r.skipped, 0);
    if (totalSkipped > 0) {
      recommendations.push(`Review and implement ${totalSkipped} skipped test(s)`);
    }

    // Performance recommendations
    const totalDuration = this.results.reduce((sum, r) => sum + r.duration, 0);
    if (totalDuration > 60000) { // More than 1 minute
      recommendations.push('Consider optimizing test performance for faster CI/CD pipeline');
    }

    return recommendations;
  }
}

// Export for use in other scripts
export { IntegrationTestRunner };

// Run if called directly
if (require.main === module) {
  const runner = new IntegrationTestRunner();
  runner.runAllTests().catch(console.error);
}