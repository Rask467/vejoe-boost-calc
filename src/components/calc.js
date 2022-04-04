import React, { useState, useEffect } from 'react'
import { getJoeFarms, getPairInfo } from '../utils/farms'
import { ethers } from 'ethers'
import { ApolloClient, InMemoryCache, gql } from '@apollo/client'

export default function Calc() {
    const [pairs, setPairs] = useState([])
    const [selectedPairID, setSelectedPairID] = useState('')
    const [selectedPair, setSelectedPair] = useState({})
    const [token0Value, setToken0Value] = useState(0)
    const [token1Value, setToken1Value] = useState(0)
    const [loading, setLoading] = useState(false)
    const [poolShare, setPoolShare] = useState(0)
    const [veJoeOrJoe, setVeJoeOrJoe] = useState('veJoe')
    const [veJoeData, setVeJoeData] = useState({})
    const [joeStake, setJoeStake] = useState(0)
    const [veJoeSupply, setVEJoeSupply] = useState(0)
    const BOOSTEDURL = 'https://api.thegraph.com/subgraphs/name/traderjoe-xyz/boosted-master-chef'
    const EXCHANGEURL = 'https://api.thegraph.com/subgraphs/name/traderjoe-xyz/exchange'
    const VEJOEURL = 'https://api.thegraph.com/subgraphs/name/traderjoe-xyz/vejoe'

    const poolsQuery = `
        query {
            pools {
                id
                pair
            }
        }
    `

    const pairsQuery = `
        query($ids: [ID]) {
            pairs(where: {id_in: $ids}) {
                id
                name
                token0Price
                token1Price
                reserve0
                reserve1
                totalSupply
                token0 {
                    id
                    symbol
                }
                token1 {
                    id
                    symbol
                }
              }
        }
    `

    const veJoeQuery = `
    {
        veJoes(first: 5) {
          id
          joeStaked
          joeStakedUSD
          totalVeJoeMinted
        }
      }
    `

    const boostedClient = new ApolloClient({
        uri: BOOSTEDURL,
        cache: new InMemoryCache(),
    })

    const exchangeClient = new ApolloClient({
        uri: EXCHANGEURL,
        cache: new InMemoryCache(),
    })

    const veJoeClient = new ApolloClient({
        uri: VEJOEURL,
        cache: new InMemoryCache()
    })

    useEffect(() => {
        boostedClient
        .query({
            query: gql(poolsQuery),
        })
        .then((data) => {
            setLoading(true)
            console.log('Subgraph data: ', data)
            exchangeClient
            .query({
                query: gql(pairsQuery),
                variables: {
                    ids: data.data.pools.map(d => d.pair)
                }
            })
            .then((data) => {
                console.log(data)
                setPairs(data.data.pairs)
                setSelectedPair(data.data.pairs[0])
                setLoading(false)
            })
            .catch((err) => {
                console.log('Error fetching data: ', err)
                setLoading(false)
            })
        })
        .catch((err) => {
            console.log('Error fetching data: ', err)
            setLoading(false)
        })
        veJoeClient.query({
            query: gql(veJoeQuery)
        })
        .then((data) => {
            console.log(data)
            setVeJoeData(data.data.veJoes[0])
            setVEJoeSupply(data.data.veJoe[0].totalVeJoeMinted)
        })
        .catch((err) => {
            console.log('Error fetching data: ', err)
        })
    }, [])

    useEffect(() => {
        let p = pairs.find(pair => pair.id === selectedPairID)
        if (p !== undefined & p !== null) {
            setSelectedPair(p)
            setToken0Value(0)
            setToken1Value(0)
        }
    }, [selectedPairID])

    useEffect(() => {
        const totalInPool = selectedPair.reserve0 * selectedPair.reserve1
        const totalAddedByUser = token0Value * token1Value
        const poolShare = (totalAddedByUser / totalInPool) * 100
        setPoolShare(poolShare.toFixed(2))
    }, [token0Value, token1Value])

    let boostedPairOptions = pairs.map(pair => {
        return <option key={pair.id} value={pair.id} >{pair.name}</option>
    })

    function setTokenAmount(tokenId, amount) {
        if(tokenId === 0) {
            setToken0Value(amount * selectedPair.token0Price)
            setToken1Value(amount)
        } else if(tokenId === 1) {
            setToken1Value(amount * selectedPair.token1Price)
            setToken0Value(amount)
        }
    }

    function handleJoeStake(value) {
        console.log(value)
        setJoeStake(value)
    }

    return (
        <div>
            <h1>Booster Calculator</h1>
            <h3>My Staked Deposit</h3>
            <div style={{marginBottom: "10px"}}>
                {loading ? 'Loading pairs...' : ''}
            </div>
            <select value={selectedPairID} onChange={(e) => setSelectedPairID(e.target.value)}>
                {boostedPairOptions}
            </select>
            <h3>Pool liquidity</h3>
            <div style={{marginBottom: "20px"}}>
                <input type="number" placeholder={selectedPair?.totalSupply} />
            </div>
            <div>
                <h4>{selectedPair?.token0?.symbol}</h4>
                <input type="number" value={token0Value} onChange={(e) => setTokenAmount(1, e.target.value)} placeholder={selectedPair?.token0?.symbol} />
            </div>
            <div>
                <h4>{selectedPair?.token1?.symbol}</h4>
                <input type="number" value={token1Value} onChange={(e) => setTokenAmount(0, e.target.value)} placeholder={selectedPair?.token1?.symbol}/>
            </div>
            <div style={{display: "flex", justifyContent: "center", marginTop: "20px"}}>
                <div style={{marginRight: "20px"}}>Pool Share</div>
                <div>
                    {
                        poolShare > 0.1
                        ?
                        <div>{poolShare}%</div>
                        :
                        <div>&lt;0.1%</div>
                    }
                </div>
            </div>

            <select value={veJoeOrJoe} onChange={e => setVeJoeOrJoe(e.target.value)}>
                <option value="veJoe">veJoe</option>
                <option value="Joe">Joe</option>
            </select>

            <h3>My {veJoeOrJoe}</h3>
            <input type="number" onChange={(e) => handleJoeStake(e.target.value)}/>

            <h3>Total veJoe Supply</h3>
            <input type="number" value={veJoeSupply} onChange={(e) => setVEJoeSupply(e.target.value)} />

            <div style={{display: "flex", justifyContent: "center"}}>
                <div style={{marginRight: "20px"}}>veJoe share</div>
                <div>0.00%</div>
            </div> 
            <div style={{display: "flex", justifyContent: "center"}}>
                <div style={{marginRight: "20px"}}>Base APR</div>
                <div>5.00%</div>
            </div>
            <div style={{display: "flex", justifyContent: "center"}}>
                <div style={{marginRight: "20px"}}>Current Boosted APR</div>
                <div>2.00%</div>
            </div>
            <div style={{display: "flex", justifyContent: "center"}}>
                <div style={{marginRight: "20px"}}>Estimated Boosted APR</div>
                <div>1.00%</div>
            </div>
        </div>
    )
}