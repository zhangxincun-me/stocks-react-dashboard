import baostock as bs
import pandas as pd
import time


def test_baostock_stability(symbol="sh.600406", days=30):
    print(f"[{time.strftime('%H:%M:%S')}] 🚀 开始启动 BaoStock 稳定性测试...")

    # 1. 登录系统 (必须执行，返回 0 表示成功)
    print(f"[{time.strftime('%H:%M:%S')}] 尝试连接服务器...")
    lg = bs.login()
    if lg.error_code != '0':
        print(f"❌ 登录失败: {lg.error_msg}")
        return

    print(f"[{time.strftime('%H:%M:%S')}] ✅ 服务器连接成功！")

    try:
        # 2. 拉取数据
        # frequency="d" 表示日线，adjustflag="2" 表示前复权
        print(f"[{time.strftime('%H:%M:%S')}] 正在请求 {symbol} 的日线数据...")

        # 记录请求耗时
        start_time = time.time()

        rs = bs.query_history_k_data_plus(
            symbol,
            "date,code,open,high,low,close,volume,amount,pctChg",
            start_date='2024-01-01',
            end_date='2024-04-13',
            frequency="d",
            adjustflag="2"
        )

        # 3. 解析数据
        data_list = []
        while (rs.error_code == '0') & rs.next():
            data_list.append(rs.get_row_data())

        elapsed_time = time.time() - start_time

        if not data_list:
            print(f"[{time.strftime('%H:%M:%S')}] ⚠️ 警告：请求成功，但返回数据为空。请检查股票代码格式（须带 sh/sz 前缀）。")
        else:
            result_df = pd.DataFrame(data_list, columns=rs.fields)
            print(
                f"[{time.strftime('%H:%M:%S')}] ✅ 数据拉取成功！耗时: {elapsed_time:.2f} 秒，共获取 {len(result_df)} 条记录。")
            print("\n--- 📊 数据预览 (前 5 条) ---")
            print(result_df.head().to_string())
            print("------------------------------\n")

    except Exception as e:
        print(f"[{time.strftime('%H:%M:%S')}] ❌ 发生意外错误: {e}")

    finally:
        # 4. 安全退出系统 (释放资源)
        print(f"[{time.strftime('%H:%M:%S')}] 正在断开服务器连接...")
        bs.logout()
        print(f"[{time.strftime('%H:%M:%S')}] 🏁 测试结束。")


if __name__ == "__main__":
    # 你可以修改这里的代码测试其他股票，例如深交所的 sz.000001
    test_baostock_stability(symbol="sh.600406")