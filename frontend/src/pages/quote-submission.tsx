import React, { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { quotesApi, QuoteDetails, QuoteItemSubmission } from '../services/api'

interface QuoteFormData {
  [rfqItemId: string]: {
    price: string
    leadTimeDays: string
  }
}

function QuoteSubmission() {
  const { token } = useParams<{ token: string }>()
  const [quoteDetails, setQuoteDetails] = useState<QuoteDetails | null>(null)
  const [formData, setFormData] = useState<QuoteFormData>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    if (!token) {
      setError('Token de cotação não fornecido')
      setLoading(false)
      return
    }

    const fetchQuoteDetails = async () => {
      try {
        const details = await quotesApi.getDetails(token)
        setQuoteDetails(details)
        
        const initialFormData: QuoteFormData = {}
        details.materials.forEach(material => {
          initialFormData[material.rfq_item_id] = {
            price: '',
            leadTimeDays: ''
          }
        })
        setFormData(initialFormData)
      } catch (err: any) {
        if (err.response?.status === 401) {
          setError('Este link de cotação é inválido ou expirado.')
        } else if (err.response?.status === 403) {
          setError('Este link de cotação já foi utilizado.')
        } else {
          setError('Erro ao carregar os detalhes da cotação.')
        }
      } finally {
        setLoading(false)
      }
    }

    fetchQuoteDetails()
  }, [token])

  const handleInputChange = (rfqItemId: string, field: 'price' | 'leadTimeDays', value: string) => {
    setFormData(prev => ({
      ...prev,
      [rfqItemId]: {
        ...prev[rfqItemId],
        [field]: value
      }
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token || !quoteDetails) return

    const isValid = quoteDetails.materials.every(material => {
      const itemData = formData[material.rfq_item_id]
      return itemData?.price && parseFloat(itemData.price) > 0 &&
             itemData?.leadTimeDays && parseInt(itemData.leadTimeDays) > 0
    })

    if (!isValid) {
      setError('Por favor, preencha todos os campos com valores válidos.')
      return
    }

    setSubmitting(true)
    setError('')

    try {
      const submissionData: QuoteItemSubmission[] = quoteDetails.materials.map(material => ({
        rfq_item_id: material.rfq_item_id,
        price: parseFloat(formData[material.rfq_item_id].price),
        lead_time_days: parseInt(formData[material.rfq_item_id].leadTimeDays)
      }))

      await quotesApi.submit(token, { items: submissionData })
      setSubmitted(true)
    } catch (err: any) {
      if (err.response?.status === 401) {
        setError('Token inválido ou expirado.')
      } else if (err.response?.status === 403) {
        setError('Este link de cotação já foi utilizado.')
      } else {
        setError('Erro ao submeter a cotação. Tente novamente.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="container">
        <div style={{ maxWidth: '800px', margin: '50px auto', padding: '20px', textAlign: 'center' }}>
          <h2>Carregando...</h2>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container">
        <div style={{ maxWidth: '800px', margin: '50px auto', padding: '20px', textAlign: 'center' }}>
          <h1>AEC Axis</h1>
          <div className="error-message" style={{ marginTop: '20px' }}>
            {error}
          </div>
        </div>
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="container">
        <div style={{ maxWidth: '800px', margin: '50px auto', padding: '20px', textAlign: 'center' }}>
          <h1>AEC Axis</h1>
          <div style={{ background: '#d4edda', color: '#155724', padding: '15px', borderRadius: '5px', marginTop: '20px' }}>
            <h2>Cotação enviada com sucesso!</h2>
            <p>Obrigado por sua cotação. Entraremos em contato em breve.</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container">
      <div style={{ maxWidth: '1000px', margin: '50px auto', padding: '20px' }}>
        <h1>AEC Axis</h1>
        <h2>Submissão de Cotação</h2>
        
        {quoteDetails && (
          <div style={{ marginBottom: '30px' }}>
            <h3>Informações do Projeto</h3>
            <div style={{ background: '#f8f9fa', padding: '15px', borderRadius: '5px', marginBottom: '20px' }}>
              <p><strong>Nome:</strong> {quoteDetails.project.name}</p>
              {quoteDetails.project.address && (
                <p><strong>Endereço:</strong> {quoteDetails.project.address}</p>
              )}
            </div>

            <h3>Materiais Solicitados</h3>
            {error && <div className="error-message" style={{ marginBottom: '20px' }}>{error}</div>}
            
            <form onSubmit={handleSubmit}>
              <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px' }}>
                <thead>
                  <tr style={{ background: '#e9ecef' }}>
                    <th style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'left' }}>DESCRIÇÃO</th>
                    <th style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'center' }}>QUANTIDADE</th>
                    <th style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'center' }}>UNIDADE</th>
                    <th style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'center' }}>PREÇO UNITÁRIO (R$)</th>
                    <th style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'center' }}>PRAZO DE ENTREGA (DIAS)</th>
                  </tr>
                </thead>
                <tbody>
                  {quoteDetails.materials.map((material) => (
                    <tr key={material.id}>
                      <td style={{ padding: '12px', border: '1px solid #ddd' }}>
                        {material.description}
                      </td>
                      <td style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'center' }}>
                        {material.quantity.toString()}
                      </td>
                      <td style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'center' }}>
                        {material.unit}
                      </td>
                      <td style={{ padding: '12px', border: '1px solid #ddd' }}>
                        <input
                          type="number"
                          step="0.01"
                          min="0.01"
                          className="form-input"
                          style={{ width: '100%' }}
                          placeholder="0.00"
                          value={formData[material.rfq_item_id]?.price || ''}
                          onChange={(e) => handleInputChange(material.rfq_item_id, 'price', e.target.value)}
                          required
                        />
                      </td>
                      <td style={{ padding: '12px', border: '1px solid #ddd' }}>
                        <input
                          type="number"
                          min="1"
                          className="form-input"
                          style={{ width: '100%' }}
                          placeholder="0"
                          value={formData[material.rfq_item_id]?.leadTimeDays || ''}
                          onChange={(e) => handleInputChange(material.rfq_item_id, 'leadTimeDays', e.target.value)}
                          required
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              <button
                type="submit"
                className="btn"
                disabled={submitting}
                style={{ width: '100%', padding: '12px', fontSize: '16px' }}
              >
                {submitting ? 'Enviando Cotação...' : 'Enviar Cotação'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}

export default QuoteSubmission