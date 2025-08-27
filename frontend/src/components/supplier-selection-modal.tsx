import { useState, useEffect } from 'react'
import { suppliersApi, Supplier } from '../services/api'

interface SupplierSelectionModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (supplierIds: string[]) => void
  selectedMaterialCount: number
}

function SupplierSelectionModal({ 
  isOpen, 
  onClose, 
  onSubmit, 
  selectedMaterialCount 
}: SupplierSelectionModalProps) {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [selectedSupplierIds, setSelectedSupplierIds] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (isOpen) {
      loadSuppliers()
      setSelectedSupplierIds(new Set())
    }
  }, [isOpen])

  const loadSuppliers = async () => {
    try {
      setIsLoading(true)
      setError('')
      const suppliersData = await suppliersApi.getAll()
      setSuppliers(suppliersData)
    } catch (err) {
      setError('Erro ao carregar fornecedores')
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSupplierSelect = (supplierId: string, checked: boolean) => {
    const newSelected = new Set(selectedSupplierIds)
    if (checked) {
      newSelected.add(supplierId)
    } else {
      newSelected.delete(supplierId)
    }
    setSelectedSupplierIds(newSelected)
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIds = suppliers.map(s => s.id)
      setSelectedSupplierIds(new Set(allIds))
    } else {
      setSelectedSupplierIds(new Set())
    }
  }

  const handleSubmit = () => {
    onSubmit(Array.from(selectedSupplierIds))
  }

  if (!isOpen) return null

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          padding: '30px',
          maxWidth: '600px',
          width: '90%',
          maxHeight: '80vh',
          overflow: 'auto',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3>Selecionar Fornecedores</h3>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '20px',
              cursor: 'pointer',
              color: '#6c757d'
            }}
          >
            ×
          </button>
        </div>

        <div style={{ marginBottom: '20px', color: '#6c757d' }}>
          Selecione os fornecedores para solicitar cotação de {selectedMaterialCount} {selectedMaterialCount === 1 ? 'material' : 'materiais'}.
        </div>

        {error && (
          <div className="error-message" style={{ marginBottom: '15px' }}>
            {error}
          </div>
        )}

        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '20px' }}>
            Carregando fornecedores...
          </div>
        ) : suppliers.length === 0 ? (
          <div className="empty-state">
            <h4>Nenhum fornecedor cadastrado.</h4>
            <p>Cadastre fornecedores para poder solicitar cotações.</p>
          </div>
        ) : (
          <div>
            <div style={{ marginBottom: '15px', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>
              <label style={{ display: 'flex', alignItems: 'center', fontWeight: 'bold' }}>
                <input
                  type="checkbox"
                  checked={selectedSupplierIds.size === suppliers.length && suppliers.length > 0}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  style={{ marginRight: '10px' }}
                />
                Selecionar Todos
              </label>
            </div>

            <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
              {suppliers.map((supplier) => (
                <div
                  key={supplier.id}
                  style={{
                    padding: '15px',
                    border: '1px solid #eee',
                    borderRadius: '6px',
                    marginBottom: '10px',
                    backgroundColor: selectedSupplierIds.has(supplier.id) ? '#f8f9fa' : 'white'
                  }}
                >
                  <label style={{ display: 'flex', alignItems: 'flex-start', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={selectedSupplierIds.has(supplier.id)}
                      onChange={(e) => handleSupplierSelect(supplier.id, e.target.checked)}
                      style={{ marginRight: '12px', marginTop: '2px' }}
                    />
                    <div>
                      <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
                        {supplier.name}
                      </div>
                      <div style={{ fontSize: '14px', color: '#6c757d' }}>
                        {supplier.email}
                      </div>
                      {supplier.phone && (
                        <div style={{ fontSize: '14px', color: '#6c757d' }}>
                          {supplier.phone}
                        </div>
                      )}
                    </div>
                  </label>
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '15px', marginTop: '25px' }}>
          <button
            onClick={onClose}
            className="btn btn-secondary"
            style={{
              padding: '10px 20px',
              borderRadius: '6px'
            }}
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            className="btn"
            disabled={selectedSupplierIds.size === 0}
            style={{
              backgroundColor: selectedSupplierIds.size > 0 ? '#28a745' : '#6c757d',
              color: 'white',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '6px',
              cursor: selectedSupplierIds.size > 0 ? 'pointer' : 'not-allowed'
            }}
          >
            Enviar RFQ ({selectedSupplierIds.size} {selectedSupplierIds.size === 1 ? 'fornecedor' : 'fornecedores'})
          </button>
        </div>
      </div>
    </div>
  )
}

export default SupplierSelectionModal