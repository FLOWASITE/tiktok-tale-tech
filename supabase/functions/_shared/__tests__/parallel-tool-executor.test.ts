// Tests for Parallel Tool Executor

import { describe, it, expect, vi } from 'vitest';

// Mock the dependencies
vi.mock('../tool-executor.ts', () => ({
  executeToolCall: vi.fn().mockImplementation(async (toolName: string) => {
    // Simulate some async work
    await new Promise(resolve => setTimeout(resolve, 10));
    return {
      success: true,
      tool_name: toolName,
      result: { message: `${toolName} completed` },
    };
  }),
}));

// Import after mocking
import { createExecutionPlan, executeToolsParallel, canParallelize, estimateSpeedup } from '../parallel-tool-executor.ts';
import { ToolCall } from '../tool-definitions.ts';

describe('createExecutionPlan', () => {
  it('should return single batch for independent tools', () => {
    const tools: ToolCall[] = [
      { id: '1', type: 'function', function: { name: 'web_search', arguments: '{"query":"a"}' } },
      { id: '2', type: 'function', function: { name: 'search_topics', arguments: '{"query":"b"}' } },
    ];

    const plan = createExecutionPlan(tools);
    
    expect(plan.batches.length).toBe(1);
    expect(plan.batches[0].length).toBe(2);
    expect(plan.isParallelizable).toBe(true);
  });

  it('should create sequential batches for dependent tools', () => {
    const tools: ToolCall[] = [
      { id: '1', type: 'function', function: { name: 'web_search', arguments: '{"query":"trending"}' } },
      { id: '2', type: 'function', function: { name: 'save_topic', arguments: '{"topic":"from search"}' } },
      { id: '3', type: 'function', function: { name: 'generate_script', arguments: '{"topic":"saved topic"}' } },
    ];

    const plan = createExecutionPlan(tools);
    
    // web_search -> save_topic -> generate_script (all sequential due to dependencies)
    expect(plan.batches.length).toBeGreaterThanOrEqual(2);
    expect(plan.dependencyMap.size).toBeGreaterThan(0);
  });

  it('should group independent tools in same batch', () => {
    const tools: ToolCall[] = [
      { id: '1', type: 'function', function: { name: 'web_search', arguments: '{"query":"a"}' } },
      { id: '2', type: 'function', function: { name: 'save_topic', arguments: '{"topic":"independent"}' } },
      { id: '3', type: 'function', function: { name: 'generate_script', arguments: '{"topic":"uses save_topic"}' } },
      { id: '4', type: 'function', function: { name: 'generate_carousel', arguments: '{"topic":"uses save_topic"}' } },
    ];

    const plan = createExecutionPlan(tools);
    
    // First batch: web_search + save_topic (independent)
    // Second batch: generate_script + generate_carousel (both depend on save_topic, parallel to each other)
    expect(plan.isParallelizable).toBe(true);
  });

  it('should handle single tool', () => {
    const tools: ToolCall[] = [
      { id: '1', type: 'function', function: { name: 'web_search', arguments: '{}' } },
    ];

    const plan = createExecutionPlan(tools);
    
    expect(plan.batches.length).toBe(1);
    expect(plan.batches[0].length).toBe(1);
    expect(plan.isParallelizable).toBe(false);
  });

  it('should handle empty tools array', () => {
    const plan = createExecutionPlan([]);
    
    expect(plan.batches.length).toBe(0);
    expect(plan.isParallelizable).toBe(false);
  });
});

describe('canParallelize', () => {
  it('should return true for independent tools', () => {
    const tools: ToolCall[] = [
      { id: '1', type: 'function', function: { name: 'web_search', arguments: '{}' } },
      { id: '2', type: 'function', function: { name: 'search_topics', arguments: '{}' } },
    ];

    expect(canParallelize(tools)).toBe(true);
  });

  it('should return false for single tool', () => {
    const tools: ToolCall[] = [
      { id: '1', type: 'function', function: { name: 'web_search', arguments: '{}' } },
    ];

    expect(canParallelize(tools)).toBe(false);
  });
});

describe('estimateSpeedup', () => {
  it('should calculate speedup for parallelizable tools', () => {
    const tools: ToolCall[] = [
      { id: '1', type: 'function', function: { name: 'web_search', arguments: '{}' } },
      { id: '2', type: 'function', function: { name: 'search_topics', arguments: '{}' } },
      { id: '3', type: 'function', function: { name: 'start_planning_session', arguments: '{}' } },
    ];

    const estimate = estimateSpeedup(tools);
    
    expect(estimate.sequentialBatches).toBe(3);
    expect(estimate.parallelBatches).toBeLessThanOrEqual(3);
    expect(estimate.estimatedSpeedup).toBeGreaterThanOrEqual(1);
  });
});

describe('executeToolsParallel', () => {
  it('should execute tools and return results in order', async () => {
    const tools: ToolCall[] = [
      { id: '1', type: 'function', function: { name: 'web_search', arguments: '{"query":"test"}' } },
      { id: '2', type: 'function', function: { name: 'search_topics', arguments: '{"query":"test"}' } },
    ];

    const mockContext = { supabase: {}, userId: 'user-1' };
    const results = await executeToolsParallel(tools, mockContext);

    expect(results.length).toBe(2);
    expect(results[0].tool_name).toBe('web_search');
    expect(results[1].tool_name).toBe('search_topics');
  });

  it('should handle task_complete specially', async () => {
    const tools: ToolCall[] = [
      { 
        id: '1', 
        type: 'function', 
        function: { 
          name: 'task_complete', 
          arguments: '{"summary":"Done","outputs":["item1"]}' 
        } 
      },
    ];

    const mockContext = { supabase: {}, userId: 'user-1' };
    const results = await executeToolsParallel(tools, mockContext);

    expect(results.length).toBe(1);
    expect(results[0].success).toBe(true);
    expect(results[0].result.summary).toBe('Done');
    expect(results[0].result.outputs).toEqual(['item1']);
  });

  it('should call onToolExecuting callback', async () => {
    const tools: ToolCall[] = [
      { id: '1', type: 'function', function: { name: 'web_search', arguments: '{}' } },
    ];

    const mockContext = { supabase: {}, userId: 'user-1' };
    const onToolExecuting = vi.fn();
    
    await executeToolsParallel(tools, mockContext, onToolExecuting);

    expect(onToolExecuting).toHaveBeenCalledWith('web_search');
  });
});
