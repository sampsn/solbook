'use client'

import { useState, useCallback } from 'react'
import { CommentItem } from './CommentItem'
import type { CommentNode } from '@solbook/shared/types'

interface Props {
  nodes: CommentNode[]
  postId: string
  userId: string | null
}

function countDescendants(node: CommentNode): number {
  return node.children.reduce((acc, child) => acc + 1 + countDescendants(child), 0)
}

export function CommentList({ nodes, postId, userId }: Props) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())

  const toggle = useCallback((id: string) => {
    setCollapsed(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  function renderNode(node: CommentNode, depth: number): React.ReactNode {
    const isCollapsed = collapsed.has(node.id)
    return (
      <div key={node.id}>
        <CommentItem
          node={node}
          postId={postId}
          userId={userId}
          depth={depth}
          isCollapsed={isCollapsed}
          onToggleCollapse={() => toggle(node.id)}
          replyCount={countDescendants(node)}
        />
        {!isCollapsed && node.children.map(child => renderNode(child, depth + 1))}
      </div>
    )
  }

  return <div>{nodes.map(n => renderNode(n, 0))}</div>
}
