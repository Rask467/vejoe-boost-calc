import React, { useState, useEffect } from 'react'
import { getJoeFarms, getPairName } from '../utils/farms'

export default function Calc() {
    const [farms, setFarms] = useState([])
    const [selectedFarm, setSelectedFarm] = useState({})

    useEffect(() => {
        async function fetchData () {
            let f = await getJoeFarms()
            console.log(f)
            console.log("FARMS: ", farms)
            let farmsWithName = await Promise.all(f.map(async (farm) => {
                let name = await getPairName(farm[0])
                console.log(name)
                return {name: name, farm: farm}
            }))
            console.log("farms with name: ", farmsWithName)
            setFarms(farmsWithName)
        }
        fetchData()
    }, [])

    let boostedFarmOptions = farms.map(farm => {
        if(farm !== undefined && farm.farm !== undefined) {
            return <option key={farm.farm[0]} value={farm} >{farm.name}</option>
        }
    })

    return (
        <div>
            <h1>Booster Calculator</h1>
            <h3>My Staked Deposit</h3>
            <select value={selectedFarm} onChange={(e) => {console.log(e); setSelectedFarm(e.target.value)}}>
                {boostedFarmOptions}
            </select>
            <h3>Pool liquidity</h3>
            <input type="number" placeholder="Token 0"/>
            <input type="number" placeholder="Token 1"/>
            <div style={{display: "flex", justifyContent: "center", marginTop: "20px"}}>
                <div style={{marginRight: "20px"}}>Pool Share</div>
                <div>0.00%</div>
            </div>

            <select>
                <option>veJoe</option>
                <option>Joe</option>
            </select>

            <h3>My veJoe</h3>
            <input type="number" />

            <h3>Total veJoe Supply</h3>
            <input type="number" />

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