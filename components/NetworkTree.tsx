
import React, { useState } from 'react';
import { User } from '../types';

interface TreeNodeProps {
  node: User & { children?: any[] };
  level: number;
  maxDepth: number;
}

const TreeNode: React.FC<TreeNodeProps> = ({ node, level, maxDepth }) => {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = node.children && node.children.length > 0;
  
  // If we reached max depth, stop rendering children visually in the tree
  const shouldRenderChildren = level < maxDepth;

  return (
    <div className="ml-4 md:ml-8 relative">
      {/* Connection Line Vertical */}
      {level > 0 && (
        <div className="absolute -left-4 md:-left-8 top-0 bottom-0 w-px bg-gray-200" />
      )}
      
      {/* Node Content */}
      <div className="relative py-2">
         {/* Connection Line Horizontal */}
        {level > 0 && (
          <div className="absolute -left-4 md:-left-8 top-1/2 w-4 md:w-8 h-px bg-gray-200" />
        )}
        
        <div 
          className={`
            bg-white border rounded-lg p-3 shadow-sm inline-flex items-center gap-3 transition-all hover:shadow-md
            ${level === 0 ? 'border-blue-500 ring-2 ring-blue-100' : 'border-gray-200'}
          `}
        >
          {hasChildren && shouldRenderChildren && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="w-5 h-5 flex items-center justify-center bg-gray-100 hover:bg-gray-200 rounded text-gray-600 text-xs font-bold"
            >
              {expanded ? '−' : '+'}
            </button>
          )}
          
          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm
            ${level === 0 ? 'bg-blue-600' : 'bg-slate-500'}
          `}>
            {node.name.charAt(0).toUpperCase()}
          </div>
          
          <div>
            <div className="font-semibold text-gray-800 text-sm flex items-center gap-2">
              {node.name}
              <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 rounded border border-gray-200">
                {node.referralCode}
              </span>
              <span className="text-[10px] bg-blue-50 text-blue-600 px-1.5 rounded border border-blue-100">Lvl {level}</span>
            </div>
            <div className="text-xs text-gray-500">
              Joined: {new Date(node.joinedAt).toLocaleDateString()}
            </div>
          </div>

          <div className="ml-4 pl-4 border-l border-gray-100">
            <div className="text-xs text-emerald-600 font-semibold">
              Earned: Rp {(node.totalEarnings || 0).toLocaleString('id-ID')}
            </div>
          </div>
        </div>
      </div>

      {/* Children */}
      {expanded && hasChildren && shouldRenderChildren && (
        <div className="pl-4 border-l-0 md:border-l-0 border-gray-200">
           {node.children?.map((child: any) => (
             <TreeNode key={child.id} node={child} level={level + 1} maxDepth={maxDepth} />
           ))}
        </div>
      )}
      
      {/* Indicator if children exist but are hidden due to depth limit */}
      {hasChildren && !shouldRenderChildren && (
          <div className="ml-4 md:ml-8 py-2 text-xs text-gray-400 italic">
              + {node.children?.length} more downlines (View Full Detail to see)
          </div>
      )}
    </div>
  );
};

export default TreeNode;
