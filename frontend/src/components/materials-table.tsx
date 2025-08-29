import React, { useState } from 'react'
import { useMaterials, useUpdateMaterial, useDeleteMaterial } from '../hooks/useMaterials'
import { Material, UpdateMaterialRequest } from '../services/api'

interface MaterialsTableProps {
  ifcFileId: string
  onSelectedMaterialsChange?: (selectedIds: string[]) => void
}

function MaterialsTable({ ifcFileId, onSelectedMaterialsChange }: MaterialsTableProps) {
  // React Query hooks
  const { data: materials = [], isLoading, error: queryError } = useMaterials(ifcFileId)
  const updateMaterialMutation = useUpdateMaterial()
  const deleteMaterialMutation = useDeleteMaterial()
  
  // Local state
  const [editingCell, setEditingCell] = useState<{ materialId: string; field: string } | null>(null)
  const [editValue, setEditValue] = useState('')
  const [selectedMaterials, setSelectedMaterials] = useState<Set<string>>(new Set())
  const [localError, setLocalError] = useState('')
  
  // Convert query error to string for compatibility
  const error = queryError ? 'Erro ao carregar materiais' : localError

  // Data loading is now handled by React Query hooks

  const handleCellClick = (materialId: string, field: string, currentValue: string | number) => {
    setEditingCell({ materialId, field })
    setEditValue(String(currentValue))
  }

  const handleCellSave = async () => {
    if (!editingCell) return

    const { materialId, field } = editingCell
    const material = materials.find(m => m.id === materialId)
    if (!material) return

    try {
      const updateData: UpdateMaterialRequest = {}
      
      if (field === 'description') {
        updateData.description = editValue
      } else if (field === 'quantity') {
        const numValue = parseFloat(editValue)
        if (isNaN(numValue)) {
          setLocalError('Quantidade deve ser um número válido')
          setEditingCell(null)
          return
        }
        updateData.quantity = numValue
      } else if (field === 'unit') {
        updateData.unit = editValue
      }

      await updateMaterialMutation.mutateAsync({ materialId, data: updateData })
      
      setEditingCell(null)
      setLocalError('')
    } catch (err) {
      setLocalError('Erro ao salvar alterações')
      console.error(err)
      setEditingCell(null)
    }
  }

  const handleCellCancel = () => {
    setEditingCell(null)
    setEditValue('')
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleCellSave()
    } else if (e.key === 'Escape') {
      handleCellCancel()
    }
  }

  const handleMaterialSelect = (materialId: string, checked: boolean) => {
    const newSelected = new Set(selectedMaterials)
    if (checked) {
      newSelected.add(materialId)
    } else {
      newSelected.delete(materialId)
    }
    setSelectedMaterials(newSelected)
    onSelectedMaterialsChange?.(Array.from(newSelected))
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIds = materials.map(m => m.id)
      setSelectedMaterials(new Set(allIds))
      onSelectedMaterialsChange?.(allIds)
    } else {
      setSelectedMaterials(new Set())
      onSelectedMaterialsChange?.([])
    }
  }

  const handleDelete = async (materialId: string, description: string) => {
    const confirmed = window.confirm(`Tem certeza de que deseja excluir o material "${description}"?`)
    if (!confirmed) return

    try {
      await deleteMaterialMutation.mutateAsync({ materialId, ifcFileId })
      setLocalError('')
    } catch (err) {
      setLocalError('Erro ao excluir material')
      console.error(err)
    }
  }

  const renderCell = (material: Material, field: string, value: string | number) => {
    const isEditing = editingCell?.materialId === material.id && editingCell?.field === field

    if (isEditing) {
      return (
        <input
          type={field === 'quantity' ? 'number' : 'text'}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={handleCellSave}
          onKeyDown={handleKeyPress}
          autoFocus
          style={{
            width: '100%',
            border: '1px solid #007bff',
            borderRadius: '4px',
            padding: '4px 8px',
            fontSize: '14px'
          }}
        />
      )
    }

    return (
      <span
        onClick={() => handleCellClick(material.id, field, value)}
        style={{
          cursor: 'pointer',
          display: 'block',
          padding: '4px 8px',
          borderRadius: '4px',
          minHeight: '20px'
        }}
        title="Clique para editar"
      >
        {value}
      </span>
    )
  }

  if (isLoading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        Carregando materiais...
      </div>
    )
  }

  return (
    <div>
      {error && (
        <div className="error-message" style={{ marginBottom: '15px' }}>
          {error}
        </div>
      )}

      {materials.length === 0 ? (
        <div className="empty-state">
          <h4>Nenhum material encontrado.</h4>
          <p>Este arquivo IFC não contém materiais extraíveis ou ainda está sendo processado.</p>
        </div>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th style={{ width: '40px' }}>
                <input
                  type="checkbox"
                  checked={selectedMaterials.size === materials.length && materials.length > 0}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                />
              </th>
              <th>DESCRIÇÃO</th>
              <th>QUANTIDADE</th>
              <th>UNIDADE</th>
              <th>AÇÕES</th>
            </tr>
          </thead>
          <tbody>
            {materials.map((material) => (
              <tr key={material.id}>
                <td>
                  <input
                    type="checkbox"
                    checked={selectedMaterials.has(material.id)}
                    onChange={(e) => handleMaterialSelect(material.id, e.target.checked)}
                  />
                </td>
                <td>
                  {renderCell(material, 'description', material.description)}
                </td>
                <td>
                  {renderCell(material, 'quantity', material.quantity)}
                </td>
                <td>
                  {renderCell(material, 'unit', material.unit)}
                </td>
                <td>
                  <button
                    onClick={() => handleDelete(material.id, material.description)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '16px',
                      color: '#dc3545',
                      padding: '4px 8px'
                    }}
                    title="Excluir material"
                  >
                    🗑️
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

export default MaterialsTable