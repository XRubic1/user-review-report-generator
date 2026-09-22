import { useMemo } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { UserMetrics } from '../lib/evaluate'

type Props = {
  rows: UserMetrics[]
}

const tooltipStyle = {
  background: '#f7f1e8',
  border: '1px solid #d4c4b0',
  borderRadius: 6,
  fontSize: 12,
}

const BAR = 18

const labelStyle = {
  fontSize: 11,
  fontWeight: 600,
  fill: '#3d3228',
}

function TotalLabel(props: {
  x?: number | string
  y?: number | string
  width?: number | string
  value?: number | string
}) {
  const { x = 0, y = 0, width = 0, value } = props
  if (value == null || value === '') return null
  const cx = Number(x) + Number(width) / 2
  const cy = Number(y) - 6
  return (
    <text
      x={cx}
      y={cy}
      textAnchor="middle"
      style={labelStyle}
    >
      {value}
    </text>
  )
}

export function WorkloadCharts({ rows }: Props) {
  const data = useMemo(
    () =>
      [...rows]
        .sort((a, b) => b.verifiedInvoices - a.verifiedInvoices)
        .map((r) => ({
          user: r.user,
          Verified: r.verifiedInvoices,
          'Not verified': r.notVerifiedInvoices,
          verifiedTotal: r.verifiedInvoices + r.notVerifiedInvoices,
          WEB: r.webInvoices,
          Phone: r.phoneInvoices,
          Email: r.emailInvoices,
          styleTotal: r.webInvoices + r.phoneInvoices + r.emailInvoices,
          VER: r.verCount,
          'P-VER': r.pverCount,
          typeTotal: r.verCount + r.pverCount,
          Outside: r.outsideInvoices,
        })),
    [rows],
  )

  if (!rows.length) return null

  const axisProps = {
    tick: { fontSize: 11, fill: '#6b5a4a' },
  }

  const chartMargin = { top: 24, right: 8, left: 0, bottom: 48 }

  return (
    <div className="charts">
      <div className="chart-card">
        <h3>Verified</h3>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={data} margin={chartMargin} barCategoryGap="28%">
            <CartesianGrid stroke="#e6d9c8" strokeDasharray="3 3" />
            <XAxis
              dataKey="user"
              {...axisProps}
              angle={-30}
              textAnchor="end"
              interval={0}
              height={60}
            />
            <YAxis {...axisProps} allowDecimals={false} width={36} />
            <Tooltip contentStyle={tooltipStyle} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="Verified" stackId="o" fill="#6b7a4e" barSize={BAR} />
            <Bar
              dataKey="Not verified"
              stackId="o"
              fill="#9c5c3d"
              barSize={BAR}
              radius={[3, 3, 0, 0]}
            >
              <LabelList dataKey="verifiedTotal" content={<TotalLabel />} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="chart-card">
        <h3>Style</h3>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={data} margin={chartMargin} barCategoryGap="28%">
            <CartesianGrid stroke="#e6d9c8" strokeDasharray="3 3" />
            <XAxis
              dataKey="user"
              {...axisProps}
              angle={-30}
              textAnchor="end"
              interval={0}
              height={60}
            />
            <YAxis {...axisProps} allowDecimals={false} width={36} />
            <Tooltip contentStyle={tooltipStyle} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="WEB" stackId="s" fill="#8b6f4e" barSize={BAR} />
            <Bar dataKey="Phone" stackId="s" fill="#a67c52" barSize={BAR} />
            <Bar
              dataKey="Email"
              stackId="s"
              fill="#c4a484"
              barSize={BAR}
              radius={[3, 3, 0, 0]}
            >
              <LabelList dataKey="styleTotal" content={<TotalLabel />} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="chart-card">
        <h3>VER / P-VER</h3>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={data} margin={chartMargin} barCategoryGap="28%">
            <CartesianGrid stroke="#e6d9c8" strokeDasharray="3 3" />
            <XAxis
              dataKey="user"
              {...axisProps}
              angle={-30}
              textAnchor="end"
              interval={0}
              height={60}
            />
            <YAxis {...axisProps} allowDecimals={false} width={36} />
            <Tooltip contentStyle={tooltipStyle} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="VER" stackId="v" fill="#a67c52" barSize={BAR} />
            <Bar
              dataKey="P-VER"
              stackId="v"
              fill="#c4a484"
              barSize={BAR}
              radius={[3, 3, 0, 0]}
            >
              <LabelList dataKey="typeTotal" content={<TotalLabel />} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="chart-card">
        <h3>Outside</h3>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={data} margin={chartMargin} barCategoryGap="28%">
            <CartesianGrid stroke="#e6d9c8" strokeDasharray="3 3" />
            <XAxis
              dataKey="user"
              {...axisProps}
              angle={-30}
              textAnchor="end"
              interval={0}
              height={60}
            />
            <YAxis {...axisProps} allowDecimals={false} width={36} />
            <Tooltip contentStyle={tooltipStyle} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar
              dataKey="Outside"
              fill="#9c5c3d"
              barSize={BAR}
              radius={[3, 3, 0, 0]}
            >
              <LabelList dataKey="Outside" content={<TotalLabel />} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
